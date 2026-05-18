import { parseStringPromise } from "xml2js";
import { getSetting } from "../config/db.ts";
import { HttpError } from "../interfaces/errors.ts";
import type { AuthUser } from "../middlewares/auth.middleware.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import {
  documentRepository,
  type DocumentListItem,
} from "../repository/document_repository.ts";
import { userRepository } from "../repository/user_repository.ts";

const SESE_CNPJ = process.env.SESE_CNPJ || "47.123.456/0001-89";

type UploadValidation = {
  status: string;
  rejectionReason: string | null;
  amount: number | null;
};

export type DocumentUploadResult = {
  id: string;
  status: string;
  rejectionReason: string | null;
  amount: number | null;
  message: string;
};

export const documentService = {
  async listForUser(userId: string): Promise<DocumentListItem[]> {
    return documentRepository.findListedByUserId(userId);
  },

  async upload(
    authUser: AuthUser,
    input: {
      userId?: string;
      filename?: string;
      content?: string;
      type?: string;
    }
  ): Promise<DocumentUploadResult> {
    const { userId, filename, content, type } = input;

    if (!userId || !content || !type) {
      throw new HttpError(400, "Dados incompletos");
    }

    if (authUser.id !== userId && !isUserAdmin(authUser)) {
      throw new HttpError(403, "Acesso negado");
    }

    const userRow = await userRepository.findReferralsCount(userId);
    if (!userRow) {
      throw new HttpError(404, "Usuário não encontrado");
    }

    const validation = await validateDocument(type, content, userRow.referrals_count);
    const docId = documentRepository.createId();

    await documentRepository.insert({
      id: docId,
      userId,
      filename,
      content,
      type,
      status: validation.status,
      rejectionReason: validation.rejectionReason,
      amount: validation.amount,
    });

    if (validation.status === "APPROVED") {
      await userRepository.updateDocumentStatus(userId, "VALIDATED");
    } else if (validation.status === "REJECTED") {
      await userRepository.updateDocumentStatus(userId, "REJECTED");
    }

    return {
      id: docId,
      status: validation.status,
      rejectionReason: validation.rejectionReason,
      amount: validation.amount,
      message:
        validation.status === "APPROVED"
          ? "Documento validado com sucesso!"
          : validation.status === "PENDING"
            ? "Documento enviado para análise manual."
            : "Documento rejeitado.",
    };
  },
};

async function validateDocument(
  type: string,
  content: string,
  referralsCount: number
): Promise<UploadValidation> {
  if (type === "NFSE") {
    return validateNfse(content, referralsCount);
  }
  if (type === "ADDRESS_PROOF_LUZ" || type === "ADDRESS_PROOF_PHONE") {
    return { status: "PENDING", rejectionReason: null, amount: null };
  }
  throw new HttpError(400, "Tipo de documento inválido.");
}

async function validateNfse(content: string, referralsCount: number): Promise<UploadValidation> {
  try {
    const result = await parseStringPromise(content);
    const nfseRoot =
      result?.CompNfse?.Nfse?.[0]?.InfNfse?.[0] ||
      result?.Nfse?.InfNfse?.[0] ||
      result?.Nfse?.InfNfse ||
      result?.ConsultarNfseResposta?.ListaNfse?.[0]?.CompNfse?.[0]?.Nfse?.[0]?.InfNfse?.[0] ||
      result?.NFe?.infNFe?.[0] ||
      result?.NFe?.infNFe;

    if (!nfseRoot) {
      throw new HttpError(400, "Estrutura XML inválida ou NFS-e não encontrada.");
    }

    const tomadorCnpj =
      nfseRoot?.TomadorServico?.[0]?.IdentificacaoTomador?.[0]?.CpfCnpj?.[0]?.Cnpj?.[0] ||
      nfseRoot?.Tomador?.[0]?.CpfCnpj?.[0]?.CNPJ?.[0] ||
      nfseRoot?.dest?.[0]?.CNPJ?.[0] ||
      "";

    const grossAmountStr =
      nfseRoot?.Servico?.[0]?.Valores?.[0]?.ValorServicos?.[0] ||
      nfseRoot?.total?.[0]?.ICMSTot?.[0]?.vNF?.[0] ||
      "0";

    const amount = parseFloat(String(grossAmountStr).replace(",", "."));
    const cleanSeseCnpj = SESE_CNPJ.replace(/[^\d]/g, "");
    const cleanTomadorCnpj = String(tomadorCnpj).replace(/[^\d]/g, "");

    if (cleanTomadorCnpj !== cleanSeseCnpj) {
      return {
        status: "REJECTED",
        rejectionReason: `CNPJ do tomador (${tomadorCnpj || "não encontrado"}) não corresponde ao da Mobicyclo.`,
        amount,
      };
    }

    const cashboardBonus = parseFloat(await getSetting("matrix_cashboard_bonus", "3990"));
    const requiredAmount = referralsCount >= 1 ? cashboardBonus / 2 : cashboardBonus;

    if (amount < requiredAmount) {
      return {
        status: "REJECTED",
        rejectionReason: `Valor bruto (R$ ${amount.toFixed(2)}) insuficiente. Mínimo necessário: R$ ${requiredAmount.toFixed(2)}`,
        amount,
      };
    }

    return { status: "APPROVED", rejectionReason: null, amount };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(400, "Erro ao processar arquivo XML.");
  }
}
