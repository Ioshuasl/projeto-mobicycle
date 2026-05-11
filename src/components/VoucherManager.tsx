import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, Send, Plus, History, CheckCircle2, AlertCircle, Search, User as UserIcon, RefreshCw, X, Mail, Phone, Copy, Share2, QrCode, Download } from 'lucide-react';
import md5 from 'md5';
import { QRCodeCanvas } from 'qrcode.react';
import { User, Voucher } from '../types';

interface VoucherManagerProps {
  user: User;
  onRefresh: () => void;
}

export function VoucherManager({ user, onRefresh }: VoucherManagerProps) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseAmount, setPurchaseAmount] = useState<string>('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [sendMode, setSendMode] = useState<'NETWORK' | 'EMAIL' | 'WHATSAPP'>('NETWORK');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [qrVoucher, setQrVoucher] = useState<Voucher | null>(null);

  useEffect(() => {
    fetchVouchers();
    fetchReferrals();
  }, []);

  const fetchVouchers = async () => {
    try {
      const res = await fetch('/api/vouchers', {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        const data = await res.ok ? await res.json() : [];
        setVouchers(data);
      }
    } catch (err) {
      console.error("Error fetching vouchers:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferrals = async () => {
    try {
      const res = await fetch('/api/user/referrals', {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        const data = await res.json();
        setReferrals(data);
      }
    } catch (err) {
      console.error("Error fetching referrals:", err);
    }
  };

  const handlePurchase = async () => {
    const amount = parseFloat(purchaseAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ text: "Valor inválido", type: 'error' });
      return;
    }

    if (amount > user.cashback_balance) {
      setMessage({ text: "Saldo de cashback insuficiente", type: 'error' });
      return;
    }

    setIsPurchasing(true);
    try {
      const res = await fetch('/api/vouchers/purchase', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ amount })
      });

      if (res.ok) {
        setMessage({ text: "Voucher adquirido com sucesso!", type: 'success' });
        setPurchaseAmount('');
        fetchVouchers();
        onRefresh();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Erro ao adquirir voucher", type: 'error' });
      }
    } catch (err) {
      setMessage({ text: "Erro de conexão", type: 'error' });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSend = async () => {
    if (!selectedVoucher || !selectedRecipient) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/vouchers/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ 
          voucherId: selectedVoucher.id,
          recipientId: sendMode === 'NETWORK' ? selectedRecipient : undefined,
          recipientEmail: sendMode === 'EMAIL' ? recipientEmail : undefined,
          recipientPhone: sendMode === 'WHATSAPP' ? recipientPhone : undefined
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: "Voucher enviado com sucesso!", type: 'success' });
        
        if (sendMode === 'WHATSAPP' && data.whatsappUrl) {
          window.open(data.whatsappUrl, '_blank');
        }

        setSelectedVoucher(null);
        setSelectedRecipient('');
        setRecipientEmail('');
        setRecipientPhone('');
        fetchVouchers();
      } else {
        setMessage({ text: data.error || "Erro ao enviar voucher", type: 'error' });
      }
    } catch (err) {
      setMessage({ text: "Erro de conexão", type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const filteredReferrals = referrals.filter(ref => 
    ref.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (ref.nickname && ref.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Ticket className="w-6 h-6 text-emerald-500" />
            Gestão de Vouchers
          </h2>
          <p className="text-[var(--text-muted)] text-sm">Adquira e envie vouchers para sua rede</p>
          <p className="text-emerald-500/80 text-xs mt-1 font-medium">
            * Regra: Somente cadastrados diretos podem usar vouchers para corridas no app de mobilidade.
          </p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
          <p className="text-xs text-emerald-500 uppercase font-bold tracking-wider">Saldo Cashback</p>
          <p className="text-xl font-bold text-[var(--text-main)]">R$ {(user.cashback_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              Adquirir Voucher
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Valor do Voucher (R$)</label>
                <input
                  type="number"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  placeholder="Ex: 50.00"
                  className="w-full bg-[var(--border-main)] border border-[var(--text-muted)] rounded-xl px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <button
                onClick={handlePurchase}
                disabled={isPurchasing || !purchaseAmount}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isPurchasing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Ticket className="w-5 h-5" />}
                Confirmar Compra
              </button>
              <p className="text-[10px] text-[var(--text-muted)] text-center italic">
                O valor será debitado do seu saldo de cashback.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              Resumo
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-[var(--border-main)] rounded-xl">
                <span className="text-[var(--text-muted)] text-sm">Disponíveis</span>
                <span className="text-[var(--text-main)] font-bold">{vouchers.filter(v => v.status === 'AVAILABLE').length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[var(--border-main)] rounded-xl">
                <span className="text-[var(--text-muted)] text-sm">Enviados</span>
                <span className="text-[var(--text-main)] font-bold">{vouchers.filter(v => v.status === 'SENT').length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[var(--border-main)] rounded-xl">
                <span className="text-[var(--text-muted)] text-sm">Total Adquirido</span>
                <span className="text-[var(--text-main)] font-bold">R$ {vouchers.reduce((acc, v) => acc + v.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vouchers List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-4">Meus Vouchers</h3>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : vouchers.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                <p className="text-[var(--text-muted)]">Você ainda não possui vouchers.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vouchers.map((voucher) => (
                  <motion.div
                    key={voucher.id}
                    layoutId={voucher.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      voucher.status === 'AVAILABLE' 
                        ? 'bg-[var(--border-main)] border-[var(--text-muted)] hover:border-emerald-500/50' 
                        : 'bg-[var(--bg-sidebar)] border-[var(--border-main)] opacity-75'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="bg-emerald-500/10 p-2 rounded-lg">
                        <Ticket className="w-5 h-5 text-emerald-500" />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                        voucher.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'
                      }`}>
                        {voucher.status === 'AVAILABLE' ? 'Disponível' : voucher.status === 'SENT' ? 'Enviado' : 'Usado'}
                      </span>
                    </div>
                    
                    <div className="space-y-1 mb-4">
                      <p className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-tighter">Código: {voucher.code}</p>
                      <p className="text-2xl font-bold text-[var(--text-main)]">R$ {voucher.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>

                    {voucher.status === 'AVAILABLE' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedVoucher(voucher)}
                          className="flex-1 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)] text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Share2 className="w-3 h-3" />
                          Presentear
                        </button>
                        <button
                          onClick={() => setQrVoucher(voucher)}
                          className="bg-[var(--border-main)] hover: text-white p-2 rounded-lg transition-all flex items-center justify-center"
                          title="Gerar QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {voucher.status === 'SENT' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mt-2">
                          <UserIcon className="w-3 h-3" />
                          <span>
                            Enviado para: {
                              voucher.recipientId || 
                              voucher.recipientEmail || 
                              (voucher.recipientPhone ? `WhatsApp (${voucher.recipientPhone})` : 'Desconhecido')
                            }
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedVoucher(voucher);
                            if (voucher.recipientEmail) setSendMode('EMAIL');
                            else if (voucher.recipientPhone) setSendMode('WHATSAPP');
                            else setSendMode('NETWORK');
                          }}
                          className="w-full bg-[var(--border-main)] hover:bg-[var(--glass-bg)] text-[var(--text-muted)] text-[10px] font-bold py-1.5 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reenviar
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send Modal */}
      <AnimatePresence>
        {qrVoucher && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQrVoucher(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-3xl p-8 shadow-2xl text-center"
            >
              <button 
                onClick={() => setQrVoucher(null)} 
                className="absolute top-4 right-4 p-2 hover:bg-[var(--border-main)] rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>

              <div className="mb-6">
                <div className="bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-main)]">QR Code do Voucher</h3>
                <p className="text-[var(--text-muted)] text-sm">Compartilhe este código para uso rápido</p>
              </div>

              <div className="bg text-white p-6 rounded-3xl inline-block mb-6 shadow-xl shadow-emerald-500/10">
                <QRCodeCanvas
                  id="voucher-qr-code"
                  value={JSON.stringify({
                    code: qrVoucher.code,
                    amount: qrVoucher.amount,
                    type: 'VOUCHER'
                  })}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="bg-[var(--border-main)] p-4 rounded-2xl mb-6 border border-[var(--text-muted)]">
                <p className="text-xs text-[var(--text-muted)] uppercase font-bold mb-1">Código do Voucher</p>
                <p className="text-xl font-mono text-[var(--text-main)] font-bold">{qrVoucher.code}</p>
                <p className="text-emerald-500 font-bold mt-1">R$ {qrVoucher.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>

              <button
                onClick={() => {
                  const canvas = document.getElementById('voucher-qr-code') as HTMLCanvasElement;
                  if (canvas) {
                    const url = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.download = `voucher-${qrVoucher.code}.png`;
                    link.href = url;
                    link.click();
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Baixar QR Code
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Send Modal */}
      <AnimatePresence>
        {selectedVoucher && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVoucher(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Send className="w-6 h-6 text-blue-500" />
                  Enviar Voucher
                </h3>
                <button onClick={() => setSelectedVoucher(null)} className="p-2 hover:bg-[var(--border-main)] rounded-xl transition-colors">
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>

              <div className="bg-[var(--border-main)] p-4 rounded-2xl mb-6 border border-[var(--text-muted)]">
                <p className="text-xs text-[var(--text-muted)] uppercase font-bold mb-1">Voucher Selecionado</p>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-main)] font-mono">{selectedVoucher.code}</span>
                  <span className="text-emerald-500 font-bold">R$ {selectedVoucher.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSendMode('NETWORK')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    sendMode === 'NETWORK' ? ' text-white' : 'bg-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--glass-bg)]'
                  }`}
                >
                  Minha Rede
                </button>
                <button
                  onClick={() => setSendMode('EMAIL')}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all ${
                    sendMode === 'EMAIL' ? ' text-white' : 'bg-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--glass-bg)]'
                  }`}
                >
                  E-mail
                </button>
                <button
                  onClick={() => setSendMode('WHATSAPP')}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all ${
                    sendMode === 'WHATSAPP' ? ' text-white' : 'bg-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--glass-bg)]'
                  }`}
                >
                  WhatsApp
                </button>
              </div>

              <div className="space-y-4">
                {sendMode === 'NETWORK' ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar indicado direto..."
                        className="w-full bg-[var(--border-main)] border border-[var(--text-muted)] rounded-xl pl-12 pr-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="max-h-[200px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                      {filteredReferrals.length === 0 ? (
                        <p className="text-center py-4 text-[var(--text-muted)] text-sm">Nenhum indicado encontrado.</p>
                      ) : (
                        filteredReferrals.map((ref) => (
                          <button
                            key={ref.id}
                            onClick={() => setSelectedRecipient(ref.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                              selectedRecipient === ref.id 
                                ? ' text-white' 
                                : 'bg-[var(--border-main)] border-[var(--text-muted)] text-[var(--text-muted)] hover:bg-[var(--border-main)] hover:border-[var(--border-main)]'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-[var(--glass-bg)] flex items-center justify-center">
                              <UserIcon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold">{ref.nickname || ref.name}</p>
                              <p className="text-[10px] opacity-50">{ref.email}</p>
                            </div>
                            {selectedRecipient === ref.id && <CheckCircle2 className="w-4 h-4 ml-auto text-blue-500" />}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                ) : sendMode === 'EMAIL' ? (
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
                      <p className="text-[10px] text-blue-400 leading-relaxed">
                        O amigo receberá um e-mail com o voucher e seu link de cadastro. 
                        Ele deve se cadastrar usando seu link para poder usar o presente.
                      </p>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="E-mail do amigo..."
                        className="w-full bg-[var(--border-main)] border border-[var(--text-muted)] rounded-xl pl-12 pr-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                      <p className="text-[10px] text-emerald-400 leading-relaxed">
                        Ao confirmar, o WhatsApp será aberto com uma mensagem contendo o voucher e seu link de cadastro.
                      </p>
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="WhatsApp do amigo (ex: 5511999999999)..."
                        className="w-full bg-[var(--border-main)] border border-[var(--text-muted)] rounded-xl pl-12 pr-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSend}
                  disabled={isSending || (sendMode === 'NETWORK' ? !selectedRecipient : sendMode === 'EMAIL' ? !recipientEmail : !recipientPhone)}
                  className={`flex-1 disabled:opacity-50 text-[var(--text-main)] font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg ${
                    sendMode === 'WHATSAPP' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                  }`}
                >
                  {isSending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {selectedVoucher.status === 'SENT' ? 'Reenviar' : 'Confirmar Envio'}
                </button>

                <button
                  onClick={() => {
                    const link = `${window.location.origin}/?ref=${md5(user?.email || '')}/${user?.nickname || ''}`;
                    navigator.clipboard.writeText(link);
                    setMessage({ text: "Link de indicação copiado!", type: 'success' });
                  }}
                  className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors py-2"
                >
                  <Copy className="w-3 h-3" />
                  Copiar meu link de indicação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
