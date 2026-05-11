import { parseStringPromise } from 'xml2js';

export async function validateNFS(xmlContent: string, userReferrals: number, seseCnpj: string, cashboardBonus: number = 3990.00) {
  try {
    const result = await parseStringPromise(xmlContent);
    
    // Try to find the root of the NFS-e info
    // Common paths: result.CompNfse.Nfse[0].InfNfse[0] or result.Nfse.InfNfse
    const nfseRoot = 
      result?.CompNfse?.Nfse?.[0]?.InfNfse?.[0] || 
      result?.Nfse?.InfNfse?.[0] || 
      result?.Nfse?.InfNfse ||
      result?.ConsultarNfseResposta?.ListaNfse?.[0]?.CompNfse?.[0]?.Nfse?.[0]?.InfNfse?.[0] ||
      result?.NFe?.infNFe?.[0] || // NF-e (product) as fallback
      result?.NFe?.infNFe;

    if (!nfseRoot) {
      return { valid: false, message: 'Estrutura XML inválida ou NFS-e não encontrada.' };
    }

    // Extract CNPJ (handles both NFS-e and NF-e structures)
    const tomadorCnpj = 
      nfseRoot?.TomadorServico?.[0]?.IdentificacaoTomador?.[0]?.CpfCnpj?.[0]?.Cnpj?.[0] ||
      nfseRoot?.Tomador?.[0]?.CpfCnpj?.[0]?.CNPJ?.[0] ||
      nfseRoot?.dest?.[0]?.CNPJ?.[0] ||
      '';

    // Extract Amount
    const grossAmountStr = 
      nfseRoot?.Servico?.[0]?.Valores?.[0]?.ValorServicos?.[0] ||
      nfseRoot?.total?.[0]?.ICMSTot?.[0]?.vNF?.[0] ||
      '0';
    
    const grossAmount = parseFloat(grossAmountStr.replace(',', '.'));

    // Clean CNPJs for comparison
    const cleanSeseCnpj = seseCnpj.replace(/[^\d]/g, '');
    const cleanTomadorCnpj = tomadorCnpj.replace(/[^\d]/g, '');

    if (cleanTomadorCnpj !== cleanSeseCnpj && cleanSeseCnpj !== '') {
      return { valid: false, message: `CNPJ do tomador (${tomadorCnpj || 'não encontrado'}) não corresponde ao da MOBICYCLE.` };
    }

    // Validation rules based on referrals
    const requiredAmount = userReferrals >= 1 ? (cashboardBonus / 2) : cashboardBonus;
    if (grossAmount < requiredAmount) {
      return { valid: false, message: `Valor bruto (R$ ${grossAmount.toFixed(2)}) insuficiente. Mínimo necessário: R$ ${requiredAmount.toFixed(2)}` };
    }

    return { 
      valid: true, 
      message: `Nota fiscal validada! Valor: R$ ${grossAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
    };
  } catch (err) {
    console.error('XML Parse Error:', err);
    return { valid: false, message: 'Erro ao processar arquivo XML. Verifique se é um arquivo NFS-e válido.' };
  }
}
