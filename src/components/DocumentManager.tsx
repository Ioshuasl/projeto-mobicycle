import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  FileCode,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserDocument } from '../types';

interface DocumentManagerProps {
  user: User;
  hideHeader?: boolean;
}

export function DocumentManager({ user, hideHeader = false }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'NFSE' | 'ADDRESS_PROOF_LUZ' | 'ADDRESS_PROOF_PHONE'>('NFSE');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents', {
        headers: { 'x-user-id': user.id }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (selectedType === 'NFSE' && !file.name.toLowerCase().endsWith('.xml')) {
      setUploadStatus({ success: false, message: 'Por favor, selecione um arquivo XML válido para NFS-e.' });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    try {
      let content: string;
      if (selectedType === 'NFSE') {
        content = await file.text();
      } else {
        // For address proof, we'll use base64 for images/pdfs
        const reader = new FileReader();
        content = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          filename: file.name,
          content,
          type: selectedType
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setUploadStatus({ 
          success: result.status !== 'REJECTED', 
          message: result.message
        });
        fetchDocuments();
      } else {
        setUploadStatus({ success: false, message: result.error || 'Erro ao processar documento.' });
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus({ success: false, message: 'Erro de conexão ao enviar arquivo.' });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'NFSE': return 'NFS-e XML';
      case 'ADDRESS_PROOF_LUZ': return 'Comprovante (Luz)';
      case 'ADDRESS_PROOF_PHONE': return 'Comprovante (Telefone)';
      default: return type;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic">Gestão de Documentos</h3>
            <p className="text-[var(--text-muted)] text-sm">Envie e acompanhe a validação de suas notas fiscais e comprovantes.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-xs font-bold text-[var(--text-main)] outline-none focus:border-blue-500 transition-all"
            >
              <option value="NFSE">NFS-e (XML)</option>
              <option value="ADDRESS_PROOF_LUZ">Comprovante de Endereço (Luz)</option>
              <option value="ADDRESS_PROOF_PHONE">Comprovante de Endereço (Telefone)</option>
            </select>

            <label className="cursor-pointer">
              <input 
                type="file" 
                accept={selectedType === 'NFSE' ? ".xml" : "image/*,.pdf"} 
                onChange={handleFileUpload} 
                className="hidden" 
                disabled={isUploading}
              />
              <div className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${isUploading ? 'bg-[var(--border-main)] text-[var(--text-muted)]' : ' text-white shadow-xl shadow-blue-900/40'}`}>
                {isUploading ? <Clock className="animate-spin" size={16} /> : <Upload size={16} />}
                {isUploading ? 'Enviando...' : `Upload ${selectedType === 'NFSE' ? 'XML' : 'Arquivo'}`}
              </div>
            </label>
          </div>
        </div>
      )}

      {hideHeader && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <Upload size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Novo Upload</p>
              <p className="text-xs text-[var(--text-muted)]">Selecione o tipo e envie seu arquivo</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="flex-1 sm:flex-none bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-[10px] font-bold text-[var(--text-main)] outline-none focus:border-blue-500 transition-all"
            >
              <option value="NFSE">NFS-e (XML)</option>
              <option value="ADDRESS_PROOF_LUZ">Comprovante (Luz)</option>
              <option value="ADDRESS_PROOF_PHONE">Comprovante (Telefone)</option>
            </select>

            <label className="cursor-pointer">
              <input 
                type="file" 
                accept={selectedType === 'NFSE' ? ".xml" : "image/*,.pdf"} 
                onChange={handleFileUpload} 
                className="hidden" 
                disabled={isUploading}
              />
              <div className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${isUploading ? 'bg-[var(--border-main)] text-[var(--text-muted)]' : ' text-white shadow-xl shadow-blue-900/20'}`}>
                {isUploading ? <Clock className="animate-spin" size={12} /> : <Upload size={12} />}
                {isUploading ? '...' : 'Upload'}
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Upload Status Feedback */}
      <AnimatePresence>
        {uploadStatus && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-2xl border flex items-center gap-3 ${uploadStatus.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
          >
            {uploadStatus.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-bold">{uploadStatus.message}</span>
            <button onClick={() => setUploadStatus(null)} className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
              <XCircle size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] overflow-hidden shadow-xl">
            <div className="p-6 border-b border-[var(--border-main)] bg-[var(--bg-card)] flex items-center justify-between">
              <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} className="text-blue-500" />
                Histórico de Envios
              </h4>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">{documents.length} documentos</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-[var(--border-main)]">
                    <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tipo / Arquivo</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-right">Valor / Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <Clock className="animate-spin w-6 h-6 text-slate-700 mx-auto" />
                      </td>
                    </tr>
                  ) : documents.length > 0 ? (
                    documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-[var(--glass-bg)] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">
                              {getDocTypeLabel(doc.type)}
                            </span>
                            <div className="flex items-center gap-2">
                              <FileCode size={14} className="text-[var(--text-muted)]" />
                              <span className="text-xs text-[var(--text-main)] font-medium truncate max-w-[150px]">{doc.filename}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[10px] text-[var(--text-muted)] font-mono">
                          {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {doc.status === 'APPROVED' ? (
                              <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-lg">
                                <CheckCircle2 size={12} /> Aprovado
                              </span>
                            ) : doc.status === 'REJECTED' ? (
                              <div className="group/reason relative">
                                <span className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded-lg cursor-help">
                                  <XCircle size={12} /> Rejeitado
                                </span>
                                {doc.rejectionReason && (
                                  <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-[10px] text-[var(--text-muted)] opacity-0 group-hover/reason:opacity-100 transition-opacity z-10 pointer-events-none shadow-2xl">
                                    {doc.rejectionReason}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase rounded-lg">
                                <Clock size={12} /> Pendente
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-black text-[var(--text-main)]">
                            {doc.type === 'NFSE' && doc.amount ? `R$ ${doc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-600 italic text-sm">
                        Nenhum documento enviado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Requirements Sidebar */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg text-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <ShieldCheck className="w-12 h-12 mb-6 opacity-50" />
            <h4 className="text-lg font-black uppercase italic mb-4">Requisitos</h4>
            <div className="space-y-4">
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
                <p className="text-[10px] uppercase font-black tracking-widest mb-1 text-white">NFS-e (XML)</p>
                <p className="text-xs font-bold text-white">Deve conter o CNPJ da MOBICYCLE como tomador.</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
                <p className="text-[10px] uppercase font-black tracking-widest mb-1 text-white">Comprovante de Endereço</p>
                <p className="text-xs font-bold text-white">Luz ou Telefone em seu nome, emitido nos últimos 90 dias.</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2.5rem] p-8 shadow-xl">
            <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest mb-6">Dúvidas Frequentes</h4>
            <div className="space-y-4">
              {[
                'Onde baixo meu XML?',
                'Posso enviar foto do comprovante?',
                'Quanto tempo leva a análise?',
                'Quais documentos são aceitos?'
              ].map((q, i) => (
                <button key={i} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--glass-bg)] transition-all text-left group">
                  <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">{q}</span>
                  <ArrowUpRight size={14} className="text-slate-600 group-hover:text-blue-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
