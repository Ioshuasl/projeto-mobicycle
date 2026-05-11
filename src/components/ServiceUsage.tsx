import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Car, Utensils, Zap, ChevronRight, AlertCircle, CheckCircle2, Wallet, Truck, Wrench } from 'lucide-react';
import { User } from '../types';

interface ServiceUsageProps {
  user: User;
  onRefresh: () => void;
  matrixSettings?: any;
  filter?: 'corridas' | 'snack' | 'energy' | 'guincho';
}

export function ServiceUsage({ user, onRefresh, matrixSettings, filter }: ServiceUsageProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const guinchoUrbanoPrice = Number(matrixSettings?.service_guincho_urbano_price || 180);
  const guinchoInterurbanoPrice = Number(matrixSettings?.service_guincho_interurbano_price || 450);
  const assistenciaMensalPrice = Number(matrixSettings?.service_assistencia_mensal_price || 85);

  const corridasCurtaPrice = Number(matrixSettings?.service_corridas_curta_price || 15);
  const corridasMediaPrice = Number(matrixSettings?.service_corridas_media_price || 35);
  const corridasLongaPrice = Number(matrixSettings?.service_corridas_longa_price || 75);

  const snackRapidoPrice = Number(matrixSettings?.service_snack_rapido_price || 25);
  const snackCompletaPrice = Number(matrixSettings?.service_snack_completa_price || 55);
  const snackFamiliaPrice = Number(matrixSettings?.service_snack_familia_price || 120);

  const energyDrinkPrice = Number(matrixSettings?.service_energy_drink_price || 12);
  const energyKitPrice = Number(matrixSettings?.service_energy_kit_price || 150);
  const energyPlanoPrice = Number(matrixSettings?.service_energy_plano_price || 290);

  const habilityTestPrice1 = Number(matrixSettings?.service_bonus_hability_test_price_1 || 50);
  const habilityTestPrice2 = Number(matrixSettings?.service_bonus_hability_test_price_2 || 100);
  const habilityTestPrice3 = Number(matrixSettings?.service_bonus_hability_test_price_3 || 250);

  const services = [
    {
      id: 'corridas',
      name: 'MOBICYCLE Corridas',
      description: 'Mobilidade urbana MOBICYCLE',
      icon: Car,
      color: 'blue',
      options: [
        { label: 'Viagem Curta', amount: corridasCurtaPrice },
        { label: 'Viagem Média', amount: corridasMediaPrice },
        { label: 'Viagem Longa', amount: corridasLongaPrice }
      ]
    },
    {
      id: 'snack',
      name: 'MOBICYCLE Snack',
      description: 'Alimentação e Fast-food',
      icon: Utensils,
      color: 'yellow',
      options: [
        { label: 'Lanche Rápido', amount: snackRapidoPrice },
        { label: 'Refeição Completa', amount: snackCompletaPrice },
        { label: 'Combo Família', amount: snackFamiliaPrice }
      ]
    },
    {
      id: 'energy',
      name: 'Energy',
      description: 'Energia e Suplementos',
      icon: Zap,
      color: 'green',
      options: [
        { label: 'Energy Drink', amount: energyDrinkPrice },
        { label: 'Kit Suplementação', amount: energyKitPrice },
        { label: 'Plano Mensal Energy', amount: energyPlanoPrice }
      ]
    },
    {
      id: 'guincho',
      name: 'MOBICYCLE Guincho',
      description: 'Assistência e Guincho 24h',
      icon: Truck,
      color: 'purple',
      options: [
        { label: 'Guincho Urbano (até 20km)', amount: guinchoUrbanoPrice },
        { label: 'Guincho Interurbano (até 100km)', amount: guinchoInterurbanoPrice },
        { label: 'Assistência Completa Mensal', amount: assistenciaMensalPrice }
      ]
    },
    {
      id: 'hability_test',
      name: 'MOBICYCLE Hability',
      description: 'Teste de Habilidade e Performance',
      icon: CheckCircle2,
      color: 'orange',
      options: [
        { label: 'Teste Básico', amount: habilityTestPrice1 },
        { label: 'Teste Intermediário', amount: habilityTestPrice2 },
        { label: 'Teste Avançado', amount: habilityTestPrice3 }
      ]
    }
  ];

  const filteredServices = (filter ? services.filter(s => s.id === filter) : services).filter(s => {
    // First check visibility (for users)
    if (s.id === 'corridas' && matrixSettings?.service_corridas_visible === 'false') return false;
    if (s.id === 'snack' && matrixSettings?.service_snack_visible === 'false') return false;
    if (s.id === 'energy' && matrixSettings?.service_energy_visible === 'false') return false;
    if (s.id === 'guincho' && matrixSettings?.service_guincho_visible === 'false') return false;
    if (s.id === 'hability_test' && matrixSettings?.service_bonus_hability_test_visible === 'false') return false;

    // Then check if enabled
    if (s.id === 'corridas') return matrixSettings?.service_corridas_enabled !== 'false';
    if (s.id === 'snack') return matrixSettings?.service_snack_enabled !== 'false';
    if (s.id === 'energy') return matrixSettings?.service_energy_enabled !== 'false';
    if (s.id === 'guincho') return matrixSettings?.service_guincho_enabled !== 'false';
    if (s.id === 'hability_test') return matrixSettings?.service_bonus_hability_test_enabled !== 'false';
    return true;
  });

  const handleUseService = async (serviceName: string, amount: number) => {
    const balanceMap: Record<string, number> = {
      'MOBICYCLE Corridas': user.cashback_balance || 0,
      'MOBICYCLE Snack': user.snack_fast_cashback || 0,
      'Energy': user.energy_cashback || 0,
      'MOBICYCLE Guincho': user.guincho_cashback || 0,
      'MOBICYCLE Hability': user.hability_test_cashback || 0
    };

    const currentBalance = balanceMap[serviceName] || 0;

    if (currentBalance < amount) {
      setError(`Saldo de cashback ${serviceName} insuficiente para este serviço.`);
      return;
    }

    setLoading(`${serviceName}-${amount}`);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/services/use-cashback', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ amount, serviceName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar serviço');
      }

      setSuccess(`Pagamento de R$ ${amount.toFixed(2)} para ${serviceName} realizado com sucesso! Bônus Unilevel distribuído para sua rede.`);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic">Serviços MOBICYCLE</h3>
          <p className="text-[var(--text-muted)] text-sm">Módulo de gestão unificada do Ecossistema MOBICYCLE. Aqui você poderá monitorar o uso de todos os serviços de cashback.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {matrixSettings?.service_corridas_visible !== 'false' && (
            <div className="p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl flex items-center gap-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Car className="text-blue-500" size={20} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Corridas</p>
                <p className="text-lg font-black text-blue-500">R$ {(user.cashback_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}
          {matrixSettings?.service_snack_visible !== 'false' && (
            <div className="p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl flex items-center gap-4">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Utensils className="text-yellow-500" size={20} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Snack</p>
                <p className="text-lg font-black text-yellow-500">R$ {(user.snack_fast_cashback || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}
          {matrixSettings?.service_energy_visible !== 'false' && (
            <div className="p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl flex items-center gap-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Zap className="text-green-500" size={20} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Energy</p>
                <p className="text-lg font-black text-green-500">R$ {(user.energy_cashback || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}
          {matrixSettings?.service_guincho_visible !== 'false' && (
            <div className="p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl flex items-center gap-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Truck className="text-purple-500" size={20} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Guincho</p>
                <p className="text-lg font-black text-purple-500">R$ {(user.guincho_cashback || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}
          {matrixSettings?.service_bonus_hability_test_visible !== 'false' && (
            <div className="p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl flex items-center gap-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <CheckCircle2 className="text-orange-500" size={20} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest mb-1">Hability Test</p>
                <p className="text-lg font-black text-orange-500">R$ {(user.hability_test_cashback || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm animate-in zoom-in-95">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-500 text-sm animate-in zoom-in-95">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {filteredServices.map((service) => (
          <div key={service.id} className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-3xl overflow-hidden flex flex-col h-full">
            <div className={`p-6 bg-gradient-to-br ${
              service.color === 'blue' ? 'from-blue-600/20 to-blue-900/20' :
              service.color === 'yellow' ? 'from-yellow-600/20 to-yellow-900/20' :
              service.color === 'green' ? 'from-green-600/20 to-green-900/20' :
              service.color === 'purple' ? 'from-purple-600/20 to-purple-900/20' :
              'from-orange-600/20 to-orange-900/20'
            } border-b border-[var(--border-main)]`}>
              <div className={`p-3 rounded-2xl w-fit mb-4 ${
                service.color === 'blue' ? 'bg-blue-500/20 text-blue-500' :
                service.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-500' :
                service.color === 'green' ? 'bg-green-500/20 text-green-500' :
                service.color === 'purple' ? 'bg-purple-500/20 text-purple-500' :
                'bg-orange-500/20 text-orange-500'
              }`}>
                <service.icon size={24} />
              </div>
              <h4 className="text-xl font-black text-[var(--text-main)] uppercase italic tracking-tight">{service.name}</h4>
              <p className="text-[var(--text-muted)] text-xs">{service.description}</p>
            </div>

            <div className="p-6 space-y-4 flex-grow">
              <p className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">Opções Disponíveis</p>
              <div className="space-y-3">
                {service.options.map((option, idx) => (
                  <button
                    key={idx}
                    disabled={loading !== null || (
                      service.id === 'corridas' ? user.cashback_balance < option.amount :
                      service.id === 'snack' ? user.snack_fast_cashback < option.amount :
                      service.id === 'energy' ? user.energy_cashback < option.amount :
                      service.id === 'guincho' ? user.guincho_cashback < option.amount :
                      user.hability_test_cashback < option.amount
                    )}
                    onClick={() => handleUseService(service.name, option.amount)}
                    className="w-full p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] hover:border-[var(--text-muted)] rounded-2xl flex items-center justify-between group transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-left">
                      <p className="text-xs font-bold text-[var(--text-main)] group-hover:text-blue-400 transition-colors">{option.label}</p>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono">R$ {option.amount.toFixed(2)}</p>
                    </div>
                    {loading === `${service.name}-${option.amount}` ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-[var(--bg-card)] border-t border-[var(--border-main)]">
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Gera Bônus Unilevel 8 Níveis
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-[var(--bg-sidebar)] to-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-8">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="p-6 bg-blue-500/10 rounded-3xl border border-blue-500/20">
            <Zap className="text-blue-500" size={48} />
          </div>
          <div className="flex-grow space-y-2">
            <h4 className="text-lg font-black text-[var(--text-main)] uppercase italic tracking-tight">Economia Colaborativa</h4>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              Ao utilizar seus serviços MOBICYCLE com saldo de cashback, você não apenas economiza, mas também gera bônus para toda a sua linha ascendente até o 8º nível. 
              É o poder da rede trabalhando para você e para todos os licenciados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
