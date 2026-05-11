import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import { Share2, Copy, Check, Download, QrCode, ExternalLink, Users as UsersIcon, ArrowRight } from 'lucide-react';

interface ReferralCardProps {
  referralLink: string;
  onViewNetwork?: () => void;
  showMaterialApoio?: boolean;
  showQRCode?: boolean;
}

export function ReferralCard({ 
  referralLink, 
  onViewNetwork, 
  showMaterialApoio = false,
  showQRCode = true 
}: ReferralCardProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQRCode = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    
    try {
      // Create a new canvas to add a white background
      const paddedCanvas = document.createElement('canvas');
      const padding = 20;
      paddedCanvas.width = canvas.width + padding * 2;
      paddedCanvas.height = canvas.height + padding * 2;
      const ctx = paddedCanvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
        ctx.drawImage(canvas, padding, padding);
      }
      
      const pngFile = paddedCanvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = 'mobicycle-qr-code.png';
      downloadLink.href = pngFile;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error("Failed to download file:", err);
      alert("Erro ao baixar o QR Code. Tente novamente.");
    }
  };

  const shareText = `Junte-se à MOBICYCLE e comece a lucrar! Use meu link de convite: ${referralLink}`;
  
  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.445 0 .081 5.363.079 11.969c0 2.112.551 4.172 1.597 5.979L0 24l6.163-1.617a11.83 11.83 0 005.883 1.565h.004c6.602 0 11.967-5.367 11.97-11.97a11.815 11.815 0 00-3.488-8.482z" />,
      color: '#25D366',
      url: `https://wa.me/?text=${encodeURIComponent(shareText)}`
    },
    {
      name: 'Telegram',
      icon: <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zM17.5 8.083l-1.913 9.02c-.144.638-.522.797-1.056.497l-2.912-2.146-1.405 1.352c-.155.155-.285.285-.585.285l.209-2.96 5.388-4.868c.234-.209-.051-.325-.363-.117L8.193 13.58l-2.87-.897c-.624-.195-.636-.624.13-.92l11.218-4.322c.519-.195.974.117.829.642z" />,
      color: '#0088cc',
      url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`
    },
    {
      name: 'Facebook',
      icon: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />,
      color: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`
    },
    {
      name: 'Twitter',
      icon: <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />,
      color: '#1DA1F2',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`
    }
  ];

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MOBICYCLE Ecosystem',
          text: shareText,
          url: referralLink,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group transition-colors duration-300"
      >
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--neon-blue)]/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        {showQRCode && (
          <div className="relative">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-5 bg text-white rounded-[2rem] shadow-2xl shadow-[var(--neon-blue)]/10 relative z-10"
            >
              <QRCodeCanvas 
                id="referral-qr-code"
                value={referralLink} 
                size={160} 
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/favicon.ico",
                  x: undefined,
                  y: undefined,
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
                ref={qrRef}
              />
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={downloadQRCode}
              className="absolute -bottom-3 -right-3 w-10 h-10 bg-[var(--neon-blue)] text-[#0a0f1e] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--neon-blue)]/40 z-20 hover:bg-[var(--neon-blue)]/80 transition-colors"
              title="Baixar QR Code"
            >
              <Download size={18} />
            </motion.button>
          </div>
        )}

        <div className="flex-1 text-center md:text-left relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--neon-blue)]/10 border border-[var(--neon-blue)]/20 rounded-full mb-4">
            <Share2 size={12} className="text-[var(--neon-blue)]" />
            <span className="text-[10px] font-black text-[var(--neon-blue)] uppercase tracking-[0.2em]">Programa de Expansão</span>
          </div>
          
          <h4 className="text-2xl font-black text-[var(--text-main)] mb-3 tracking-tighter uppercase italic">
            Seu Link de Convite
          </h4>
          
          <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed max-w-md">
            Compartilhe seu link exclusivo e ganhe bônus por cada novo executivo que ingressar na sua rede MOBICYCLE.
          </p>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl group-focus-within:border-[var(--neon-blue)]/50 transition-all">
                <input 
                  type="text" 
                  readOnly 
                  value={referralLink}
                  className="bg-transparent border-none text-xs text-[var(--neon-blue)] font-mono flex-1 outline-none truncate"
                />
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--neon-blue)]/10 hover:bg-[var(--neon-blue)]/20 text-[var(--neon-blue)] rounded-xl transition-all border border-[var(--neon-blue)]/20"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Copiado</span>
                      </motion.div>
                    ) : (
                      <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
                        <Copy size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Copiar</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
              
              {showQRCode && (
                <button 
                  onClick={downloadQRCode}
                  className="px-6 py-3 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-main)] border border-[var(--border-main)] rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl flex items-center gap-2"
                >
                  <Download size={16} className="text-[var(--neon-blue)]" />
                  QR Code
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              {shareLinks.map((link) => (
                <motion.a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-main)] shadow-lg transition-all relative overflow-hidden group"
                  style={{ backgroundColor: link.color }}
                  title={`Compartilhar no ${link.name}`}
                >
                  <div className="absolute inset-0 bg text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current relative z-10">
                    {link.icon}
                  </svg>
                </motion.a>
              ))}
              
              {typeof navigator.share !== 'undefined' && (
                <motion.button
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleShare}
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--glass-bg)] text-[var(--text-main)] border border-[var(--border-main)] shadow-lg hover:bg-[var(--glass-bg-hover)] transition-all"
                  title="Mais opções de compartilhamento"
                >
                  <Share2 size={18} className="text-[var(--neon-blue)]" />
                </motion.button>
              )}
            </div>
          </div>

          {onViewNetwork && (
            <button 
              onClick={onViewNetwork}
              className="mt-6 flex items-center gap-2 text-[10px] font-black text-[var(--neon-blue)] hover:text-[var(--neon-blue)]/80 transition-colors group uppercase tracking-widest"
            >
              <UsersIcon size={14} className="group-hover:scale-110 transition-transform" />
              Ver Minha Rede Completa
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </motion.div>

      {showMaterialApoio && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-[#0a0f1e] to-[#1e293b] border border-[var(--neon-blue)]/20 rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden group shadow-2xl"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700 text-[var(--neon-blue)]">
            <QrCode size={140} />
          </div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-[var(--neon-blue)]/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-[var(--neon-blue)]/20">
              <ExternalLink size={24} className="text-[var(--neon-blue)]" />
            </div>
            <h4 className="text-2xl font-black text-[var(--text-main)] mb-3 uppercase tracking-tighter italic leading-none">
              Material de<br />Apoio
            </h4>
            <p className="text-[var(--text-muted)] text-xs leading-relaxed font-medium">
              Acesse apresentações, vídeos e artes oficiais para turbinar suas apresentações presenciais.
            </p>
          </div>
          
          <button className="mt-8 w-full py-4 bg-[var(--neon-blue)] text-[#0a0f1e] font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-[var(--neon-blue)]/80 transition-all active:scale-95 flex items-center justify-center gap-2">
            Acessar Drive Oficial
          </button>
        </motion.div>
      )}
    </div>
  );
}
