// Index para exportar todos os exercícios
import exerciciosBiceps from './biceps';
import exerciciosCostas from './costas';
import exerciciosTriceps from './triceps';
import exerciciosPeitoral from './peitoral';
import exerciciosOmbro from './ombro';
import exerciciosGluteo from './gluteo';
import exerciciosPernas from './pernas';
import exerciciosAbdomen from './abdomen';
import exerciciosCaseiro from './caseiro';

export {
  exerciciosBiceps,
  exerciciosCostas,
  exerciciosTriceps,
  exerciciosPeitoral,
  exerciciosOmbro,
  exerciciosGluteo,
  exerciciosPernas,
  exerciciosAbdomen,
  exerciciosCaseiro,
};

// Objeto com todos os exercícios organizados por categoria
export const todosExercicios = {
  biceps: exerciciosBiceps,
  costas: exerciciosCostas,
  triceps: exerciciosTriceps,
  peitoral: exerciciosPeitoral,
  ombro: exerciciosOmbro,
  gluteo: exerciciosGluteo,
  pernas: exerciciosPernas,
  abdomen: exerciciosAbdomen,
  caseiro: exerciciosCaseiro,
};

export default todosExercicios;