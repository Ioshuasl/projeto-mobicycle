import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { Book, Code, Terminal, Settings, ChevronRight, FileText } from 'lucide-react';

export function DevDocs() {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/DEVELOPER.md')
      .then(res => res.text())
      .then(text => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading docs:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--neon-blue)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
          <Code className="text-blue-400" size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight uppercase italic">Documentação Dev</h2>
          <p className="text-[var(--text-muted)] text-sm">Guia técnico e referências do ecossistema MOBICYCLE.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="md:col-span-1 space-y-2">
          <button className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <Book size={14} />
              Introdução
            </div>
            <ChevronRight size={14} />
          </button>
          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-sidebar)] border border-transparent text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest transition-all">
            <div className="flex items-center gap-2">
              <Settings size={14} />
              Configuração
            </div>
          </button>
          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-sidebar)] border border-transparent text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest transition-all">
            <div className="flex items-center gap-2">
              <Terminal size={14} />
              Comandos
            </div>
          </button>
        </div>

        {/* Main Content */}
        <div className="md:col-span-3 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[2rem] p-8 shadow-2xl">
          <div className="prose prose-invert prose-slate max-w-none 
            prose-headings:text-[var(--text-main)] prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight
            prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-[var(--border-main)]
            prose-p:text-[var(--text-muted)] prose-p:leading-relaxed
            prose-code:text-blue-400 prose-code: text-white prose-a:text-blue-400 hover:prose-a:text-blue-300
            prose-ul:list-disc prose-ul:pl-5
          ">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
