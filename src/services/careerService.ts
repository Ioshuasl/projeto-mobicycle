import { CareerLevel } from '../types';

export interface CareerQualification {
  level: CareerLevel;
  name: string;
  cyclesRequired: number;
  benefit: string;
  cashbackPerReferral?: number;
  fixedValue?: number;
}

export function getCareerPlan(settings?: any): CareerQualification[] {
  const plan: CareerQualification[] = [
    {
      level: 'LICENSED',
      name: 'Licenciado',
      cyclesRequired: 0,
      benefit: 'Acesso básico ao ecossistema MOBICYCLE',
      cashbackPerReferral: 0,
      fixedValue: 0
    },
    {
      level: 'PARTNER',
      name: 'Parceiro',
      cyclesRequired: parseInt(settings?.cycles_required_partner || '1'),
      benefit: `Bônus Infinito de R$ ${settings?.bonus_percent_partner || '0'}`,
      cashbackPerReferral: 100,
      fixedValue: parseInt(settings?.bonus_percent_partner || '0')
    },
    {
      level: 'EXECUTIVO_1',
      name: 'Bronze',
      cyclesRequired: parseInt(settings?.cycles_required_executivo_1 || '2'),
      benefit: `Bônus Infinito de R$ ${settings?.bonus_percent_executivo_1 || '5'}`,
      cashbackPerReferral: 100,
      fixedValue: parseInt(settings?.bonus_percent_executivo_1 || '5')
    },
    {
      level: 'EXECUTIVO_2',
      name: 'Prata',
      cyclesRequired: parseInt(settings?.cycles_required_executivo_2 || '5'),
      benefit: `Bônus Infinito de R$ ${settings?.bonus_percent_executivo_2 || '10'}`,
      cashbackPerReferral: 100,
      fixedValue: parseInt(settings?.bonus_percent_executivo_2 || '10')
    },
    {
      level: 'EXECUTIVO_3',
      name: 'Ouro',
      cyclesRequired: parseInt(settings?.cycles_required_executivo_3 || '10'),
      benefit: `Bônus Infinito de R$ ${settings?.bonus_percent_executivo_3 || '15'}`,
      cashbackPerReferral: 100,
      fixedValue: parseInt(settings?.bonus_percent_executivo_3 || '15')
    },
    {
      level: 'EXECUTIVO_4',
      name: 'Esmeralda',
      cyclesRequired: parseInt(settings?.cycles_required_executivo_4 || '25'),
      benefit: `Bônus Infinito de R$ ${settings?.bonus_percent_executivo_4 || '20'}`,
      cashbackPerReferral: 100,
      fixedValue: parseInt(settings?.bonus_percent_executivo_4 || '20')
    },
    {
      level: 'DIAMANTE',
      name: 'Diamante',
      cyclesRequired: parseInt(settings?.cycles_required_diamante || '50'),
      benefit: `Bônus Infinito de R$ ${settings?.bonus_percent_diamante || '25'}`,
      cashbackPerReferral: 100,
      fixedValue: parseInt(settings?.bonus_percent_diamante || '25')
    },
    {
      level: 'BLACK_DIAMANTE',
      name: 'Duplo Diamante',
      cyclesRequired: parseInt(settings?.cycles_required_black_diamante || '100'),
      benefit: `Bônus Infinito de R$ ${settings?.bonus_percent_black_diamante || '30'}`,
      cashbackPerReferral: 100,
      fixedValue: parseInt(settings?.bonus_percent_black_diamante || '30')
    },
    {
      level: 'VICE_PRESIDENTE',
      name: 'Black Diamond',
      cyclesRequired: parseInt(settings?.cycles_required_vice_presidente || '250'),
      benefit: `Bônus Infinito de R$ ${settings?.bonus_percent_vice_presidente || '35'}`,
      cashbackPerReferral: 100,
      fixedValue: parseInt(settings?.bonus_percent_vice_presidente || '35')
    },
    {
      level: 'PRESIDENTE',
      name: 'Royal Black-Diamond',
      cyclesRequired: parseInt(settings?.cycles_required_presidente || '500'),
      benefit: `Bônus Infinito de R$ ${settings?.bonus_percent_presidente || '40'}`,
      cashbackPerReferral: 100,
      fixedValue: parseInt(settings?.bonus_percent_presidente || '40')
    },
    {
      level: 'CEO_PLE',
      name: 'CEO PLE',
      cyclesRequired: parseInt(settings?.cycles_required_ceo_ple || '1000'),
      benefit: `Bônus Infinito de R$ ${settings?.bonus_percent_ceo_ple || '45'}`,
      cashbackPerReferral: 100,
      fixedValue: parseInt(settings?.bonus_percent_ceo_ple || '45')
    }
  ];
  return plan;
}

export const CAREER_PLAN = getCareerPlan();

export function getCareerLevel(cycleSalesCount: number, settings?: any): CareerQualification {
  const plan = getCareerPlan(settings);
  // Sort by cyclesRequired descending to find the highest achieved level
  const sortedPlan = [...plan].sort((a, b) => b.cyclesRequired - a.cyclesRequired);
  return sortedPlan.find(q => cycleSalesCount >= q.cyclesRequired) || plan[0];
}

export function getNextCareerLevel(cycleSalesCount: number, settings?: any): CareerQualification | null {
  const plan = getCareerPlan(settings);
  const currentQualification = getCareerLevel(cycleSalesCount, settings);
  const currentIndex = plan.findIndex(q => q.level === currentQualification.level);
  
  if (currentIndex < plan.length - 1) {
    return plan[currentIndex + 1];
  }
  
  return null;
}
