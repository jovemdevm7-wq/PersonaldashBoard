'use client';

import { useState } from 'react';
import { X, Check, Dumbbell, Search } from 'lucide-react';

interface Exercicio {
  exercicio: string;
  gif: string;
}

interface AddExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (exercicio: any) => void;
}

export default function AddExerciseModal({ isOpen, onClose, onConfirm }: AddExerciseModalProps) {
  const [etapa, setEtapa] = useState<'grupo' | 'exercicio' | 'repeticoes'>('grupo');
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);
  const [exercicioSelecionado, setExercicioSelecionado] = useState<Exercicio | null>(null);
  const [series, setSeries] = useState<string>('');
  const [repeticoes, setRepeticoes] = useState<string>('');
  const [exerciciosDoGrupo, setExerciciosDoGrupo] = useState<Exercicio[]>([]);
  const [filtroExercicio, setFiltroExercicio] = useState<string>('');

  const grupos = [
    { nome: 'Bíceps', key: 'biceps' },
    { nome: 'Costas', key: 'costas' },
    { nome: 'Tríceps', key: 'triceps' },
    { nome: 'Peitoral', key: 'peitoral' },
    { nome: 'Ombro', key: 'ombro' },
    { nome: 'Glúteo', key: 'gluteo' },
    { nome: 'Pernas', key: 'pernas' },
    { nome: 'Abdômen', key: 'abdomen' },
    { nome: 'Caseiro', key: 'caseiro' },
  ];

  const handleSelecionarGrupo = async (grupoKey: string) => {
    setGrupoSelecionado(grupoKey);
    
    // Carregar exercícios do grupo
    try {
      const modulo = await import(`@/data/exercicios/${grupoKey}`);
      setExerciciosDoGrupo(modulo.default || []);
      setEtapa('exercicio');
    } catch (error) {
      console.error('Erro ao carregar exercícios:', error);
      setExerciciosDoGrupo([]);
    }
  };

  const handleSelecionarExercicio = (exercicio: Exercicio) => {
    setExercicioSelecionado(exercicio);
    setEtapa('repeticoes');
  };

  const handleConfirmar = () => {
    if (!exercicioSelecionado || !series || !repeticoes) return;

    const exercicioCompleto = {
      exercicio: exercicioSelecionado.exercicio,
      gif: exercicioSelecionado.gif,
      series: parseInt(series),
      repeticoes: parseInt(repeticoes),
    };

    onConfirm(exercicioCompleto);
    handleClose();
  };

  const handleClose = () => {
    setEtapa('grupo');
    setGrupoSelecionado(null);
    setExercicioSelecionado(null);
    setSeries('');
    setRepeticoes('');
    setExerciciosDoGrupo([]);
    setFiltroExercicio('');
    onClose();
  };

  const handleVoltar = () => {
    if (etapa === 'exercicio') {
      setEtapa('grupo');
      setGrupoSelecionado(null);
      setExerciciosDoGrupo([]);
      setFiltroExercicio('');
    } else if (etapa === 'repeticoes') {
      setEtapa('exercicio');
      setExercicioSelecionado(null);
      setSeries('');
      setRepeticoes('');
    }
  };

  // Filtrar exercícios baseado no texto de busca
  const exerciciosFiltrados = exerciciosDoGrupo.filter((exercicio) =>
    exercicio.exercicio.toLowerCase().includes(filtroExercicio.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">
              {etapa === 'grupo' && 'Selecione o Grupo Muscular'}
              {etapa === 'exercicio' && 'Selecione o Exercício'}
              {etapa === 'repeticoes' && 'Defina Séries e Repetições'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Etapa 1: Seleção de Grupo */}
          {etapa === 'grupo' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {grupos.map((grupo) => (
                <button
                  key={grupo.key}
                  onClick={() => handleSelecionarGrupo(grupo.key)}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-all text-center"
                >
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                  <span className="font-medium text-gray-900">{grupo.nome}</span>
                </button>
              ))}
            </div>
          )}

          {/* Etapa 2: Seleção de Exercício */}
          {etapa === 'exercicio' && (
            <div className="space-y-4">
              {/* Campo de busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={filtroExercicio}
                  onChange={(e) => setFiltroExercicio(e.target.value)}
                  placeholder="Buscar exercício..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* Lista de exercícios filtrados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exerciciosFiltrados.length > 0 ? (
                  exerciciosFiltrados.map((exercicio, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelecionarExercicio(exercicio)}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-all text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                          <Dumbbell className="w-8 h-8 text-gray-400" />
                        </div>
                        <span className="font-medium text-gray-900 flex-1">
                          {exercicio.exercicio}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    Nenhum exercício encontrado com &quot;{filtroExercicio}&quot;
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Etapa 3: Definir Repetições e Séries */}
          {etapa === 'repeticoes' && exercicioSelecionado && (
            <div className="max-w-md mx-auto space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Exercício selecionado:</p>
                <p className="font-semibold text-gray-900">{exercicioSelecionado.exercicio}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Séries *
                </label>
                <input
                  type="number"
                  min="1"
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  placeholder="Ex: 3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Repetições *
                </label>
                <input
                  type="number"
                  min="1"
                  value={repeticoes}
                  onChange={(e) => setRepeticoes(e.target.value)}
                  placeholder="Ex: 12"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={etapa === 'grupo' ? handleClose : handleVoltar}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            {etapa === 'grupo' ? 'Cancelar' : 'Voltar'}
          </button>

          {etapa === 'repeticoes' && (
            <button
              onClick={handleConfirmar}
              disabled={!series || !repeticoes}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Adicionar Exercício
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
