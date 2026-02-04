// Tipos para os exercícios

export interface Exercicio {
  exercicio: string;
  gif: string;
}

export interface ExercicioComRepeticoes extends Exercicio {
  repeticoes: number;
  series: number;
}

export type GrupoMuscular = 
  | 'biceps' 
  | 'costas' 
  | 'triceps' 
  | 'peitoral' 
  | 'ombro' 
  | 'gluteo' 
  | 'pernas' 
  | 'abdomen' 
  | 'caseiro';