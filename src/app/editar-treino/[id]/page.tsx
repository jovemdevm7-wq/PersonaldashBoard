'use client';

import { useState, useEffect, use } from 'react';
import { Activity, Edit3, Check, X, Calendar, Dumbbell, Trash2, Save, Plus, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddExerciseModal from '@/components/AddExerciseModal';

type SerieObj = { peso?: number | string; repeticoes?: number | string };
type SeriesValue = number | string | SerieObj[];
type RepValue = number | string | SerieObj | SerieObj[];

function getSeriesCount(series: SeriesValue): number | string {
  if (Array.isArray(series)) return series.length;
  return series ?? 0;
}

function hasAnyPeso(series?: SeriesValue): boolean {
  if (!Array.isArray(series)) return false;
  return series.some(s => s && typeof s === 'object' && s.peso !== undefined && s.peso !== null && s.peso !== '' && Number(s.peso) > 0);
}

function formatRepeticoes(reps: RepValue, series?: SeriesValue): string {
  if (Array.isArray(series) && series.length > 0) {
    const repsList = series.map(s => s?.repeticoes ?? '');
    const pesoList = series.map(s => s?.peso ?? '');
    const allRepsEqual = repsList.every(r => r === repsList[0]);
    const allPesoEqual = pesoList.every(p => p === pesoList[0]);
    const hasPeso = hasAnyPeso(series);

    if (allRepsEqual && allPesoEqual) {
      return hasPeso ? `${repsList[0]} reps · ${pesoList[0]}kg` : `${repsList[0]} reps`;
    }
    if (!hasPeso) {
      return `${repsList.join(' / ')} reps`;
    }
    return series.map(s => {
      const r = s?.repeticoes ?? '';
      const p = s?.peso;
      return p !== undefined && p !== null && p !== '' && Number(p) > 0 ? `${r}×${p}kg` : `${r}`;
    }).join(' / ');
  }
  if (reps && typeof reps === 'object' && !Array.isArray(reps)) {
    const r = reps.repeticoes ?? '';
    const p = reps.peso;
    return p ? `${r} reps · ${p}kg` : `${r} reps`;
  }
  return `${reps ?? ''} reps`;
}

interface Exercicio {
  exercicio: string;
  gif: string;
  repeticoes: RepValue;
  series: SeriesValue;
}

interface TreinoDiario {
  exercicios: Exercicio[];
  nome: string;
}

interface TreinoData {
  nivel: string | null;
  musculo: string | null;
  treino: TreinoDiario[] | null;
}

interface UserData {
  uuid: string;
  authData: {
    email: string;
    emailVerified: boolean;
    creationTime: string;
    lastSignInTime: string;
  };
  treinoData: TreinoData;
}

export default function EditarTreino({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pendingId, setPendingId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingExercise, setDeletingExercise] = useState<{dayIndex: number, exerciseIndex: number} | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingNames, setEditingNames] = useState<{[key: number]: string}>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [editingSeries, setEditingSeries] = useState<{dayIndex: number, exerciseIndex: number} | null>(null);
  const [seriesDraft, setSeriesDraft] = useState<SerieObj[]>([]);

  const startEditSeries = (dayIndex: number, exerciseIndex: number, exercicio: Exercicio) => {
    let draft: SerieObj[] = [];
    if (Array.isArray(exercicio.series)) {
      draft = exercicio.series.map(s => ({
        peso: s?.peso ?? '',
        repeticoes: s?.repeticoes ?? (typeof exercicio.repeticoes === 'number' || typeof exercicio.repeticoes === 'string' ? exercicio.repeticoes : ''),
      }));
    } else {
      const count = Number(exercicio.series) || 1;
      const baseReps = typeof exercicio.repeticoes === 'number' || typeof exercicio.repeticoes === 'string' ? exercicio.repeticoes : '';
      draft = Array.from({ length: count }, () => ({ peso: '', repeticoes: baseReps }));
    }
    setSeriesDraft(draft);
    setEditingSeries({ dayIndex, exerciseIndex });
  };

  const cancelEditSeries = () => {
    setEditingSeries(null);
    setSeriesDraft([]);
  };

  const updateDraftSerie = (idx: number, field: 'peso' | 'repeticoes', value: string) => {
    setSeriesDraft(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addDraftSerie = () => {
    const last = seriesDraft[seriesDraft.length - 1];
    setSeriesDraft(prev => [...prev, { peso: last?.peso ?? '', repeticoes: last?.repeticoes ?? '' }]);
  };

  const removeDraftSerie = (idx: number) => {
    setSeriesDraft(prev => prev.filter((_, i) => i !== idx));
  };

  const saveEditSeries = () => {
    if (!editingSeries || !userData || !userData.treinoData.treino) return;
    const cleaned: SerieObj[] = seriesDraft.map(s => ({
      peso: s.peso === '' || s.peso === undefined || s.peso === null ? 0 : Number(s.peso),
      repeticoes: s.repeticoes === '' || s.repeticoes === undefined || s.repeticoes === null ? 0 : Number(s.repeticoes),
    }));
    const updated = { ...userData };
    if (updated.treinoData.treino) {
      const ex = updated.treinoData.treino[editingSeries.dayIndex].exercicios[editingSeries.exerciseIndex];
      ex.series = cleaned;
      const firstReps = cleaned[0]?.repeticoes;
      if (firstReps !== undefined) ex.repeticoes = firstReps;
      setUserData(updated);
      setHasUnsavedChanges(true);
    }
    cancelEditSeries();
  };

  useEffect(() => {
    const fetchPendingTreino = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`/api/get-pending-by-id/${resolvedParams.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao buscar treino');
        }

        setUserData(data.userData);
        setPendingId(data.pendingId);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchPendingTreino();
    }
  }, [resolvedParams.id]);

  const handleEditStart = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingName(currentName);
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditingName('');
  };

  const handleEditSave = () => {
    if (userData && editingIndex !== null && userData.treinoData.treino) {
      const updatedUserData = { ...userData };
      if (updatedUserData.treinoData.treino) {
        updatedUserData.treinoData.treino[editingIndex].nome = editingName;
        setUserData(updatedUserData);
        
        setEditingNames(prev => ({
          ...prev,
          [editingIndex]: editingName
        }));
        
        setHasUnsavedChanges(true);
      }
    }
    setEditingIndex(null);
    setEditingName('');
  };

  const handleDeleteExercise = (dayIndex: number, exerciseIndex: number) => {
    if (userData && userData.treinoData.treino) {
      const updatedUserData = { ...userData };
      if (updatedUserData.treinoData.treino) {
        updatedUserData.treinoData.treino[dayIndex].exercicios.splice(exerciseIndex, 1);
        setUserData(updatedUserData);
        setHasUnsavedChanges(true);
      }
    }
    setDeletingExercise(null);
  };

  const handleAddExercise = (dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setIsAddModalOpen(true);
  };

  const handleConfirmAddExercise = (exercicio: any) => {
    if (selectedDayIndex === null || !userData || !userData.treinoData.treino) return;

    const updatedUserData = { ...userData };
    if (updatedUserData.treinoData.treino) {
      updatedUserData.treinoData.treino[selectedDayIndex].exercicios.push(exercicio);
      setUserData(updatedUserData);
      setHasUnsavedChanges(true);
    }
    setIsAddModalOpen(false);
    setSelectedDayIndex(null);
  };

  const saveChanges = async () => {
    if (!userData || !hasUnsavedChanges || !pendingId) return;
    
    setSaving(true);
    try {
      if (userData.treinoData.treino) {
        // Limpar dados: remover exercícios null/undefined e reorganizar
        const treinoLimpo = userData.treinoData.treino.map(dia => ({
          ...dia,
          exercicios: dia.exercicios.filter(exercicio => 
            exercicio !== null && 
            exercicio !== undefined && 
            exercicio.exercicio && 
            exercicio.exercicio.trim() !== ''
          )
        }));

        const response = await fetch('/api/save-edited-treino', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uuid: userData.uuid,
            treino: treinoLimpo,
            pendingId: pendingId
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao salvar treino editado');
        }

        const result = await response.json();
        setError('');
        
        alert(result.message || 'Treino editado e aplicado com sucesso!');
        router.push('/aprovacoes');
      }
    } catch (err: any) {
      setError(`Erro ao salvar treino: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <p className="text-center text-gray-500">Carregando treino...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <Link 
              href="/aprovacoes"
              className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Aprovações
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 relative">
      {/* Botão Voltar */}
      <Link
        href="/aprovacoes"
        className="fixed top-4 left-4 z-50 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-gray-700" />
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">Editar Treino</h1>
                <p className="text-gray-600 mt-1">Usuário: {userData?.authData.email}</p>
              </div>
            </div>
          </div>
          
          {/* Mensagem de Erro */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Dados do Usuário */}
          {userData && (
            <div className="space-y-6">
              {/* Email do Usuário */}
              <div className="bg-white border border-gray-200 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Informações do Usuário</h3>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Email:</p>
                  <p className="text-lg text-gray-900 font-medium">{userData.authData.email}</p>
                </div>
              </div>

              {/* Treino Semanal */}
              <div className="bg-white border border-gray-200 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Treino Semanal</h3>
                  </div>
                  
                  {hasUnsavedChanges && (
                    <button
                      onClick={saveChanges}
                      disabled={saving}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Save size={18} />
                      {saving ? 'Salvando...' : 'Salvar e Aplicar'}
                    </button>
                  )}
                </div>
                
                {userData.treinoData.treino && userData.treinoData.treino.length > 0 ? (
                  <div className="space-y-4">
                    {userData.treinoData.treino.map((dia, index) => {
                      const diasDaSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
                      return (
                        <div key={index} className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-900 text-lg">
                              <span className="text-gray-600">{diasDaSemana[index]}:</span>{' '}
                              {editingIndex === index ? (
                                <span className="inline-flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={handleEditSave}
                                    className="text-green-600 hover:text-green-700 p-1 hover:bg-green-50 rounded"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleEditCancel}
                                    className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  <span className="text-gray-900">{dia.nome}</span>
                                  <button
                                    onClick={() => handleEditStart(index, dia.nome)}
                                    className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
                                    title="Editar nome do treino"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                </span>
                              )}
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dia.exercicios.filter(exercicio => exercicio !== null && exercicio !== undefined).map((exercicio, exercIndex) => {
                              const isEditingThisSeries = editingSeries?.dayIndex === index && editingSeries?.exerciseIndex === exercIndex;
                              return (
                              <div key={exercIndex} className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-sm transition-shadow group">
                                <div className="flex items-start gap-3">
                                  {exercicio.gif && exercicio.gif.trim() !== '' ? (
                                    <Image
                                      src={exercicio.gif.trim()}
                                      alt={exercicio.exercicio}
                                      width={48}
                                      height={48}
                                      className="object-cover rounded-lg flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <Dumbbell className="w-4 h-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                                      {exercicio.exercicio}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {getSeriesCount(exercicio.series)} séries · {formatRepeticoes(exercicio.repeticoes, exercicio.series)}
                                    </p>
                                  </div>
                                  <div className="flex items-start gap-1">
                                    {!isEditingThisSeries && (
                                      <button
                                        onClick={() => startEditSeries(index, exercIndex, exercicio)}
                                        className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Editar séries / peso"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                    )}
                                    {deletingExercise?.dayIndex === index && deletingExercise?.exerciseIndex === exercIndex ? (
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => handleDeleteExercise(index, exercIndex)}
                                          className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                          title="Confirmar exclusão"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => setDeletingExercise(null)}
                                          className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
                                          title="Cancelar"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      !isEditingThisSeries && (
                                        <button
                                          onClick={() => setDeletingExercise({dayIndex: index, exerciseIndex: exercIndex})}
                                          className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Excluir exercício"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>

                                {isEditingThisSeries && (
                                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                                      <div className="col-span-2">Série</div>
                                      <div className="col-span-4">Reps</div>
                                      <div className="col-span-5">Peso (kg)</div>
                                      <div className="col-span-1"></div>
                                    </div>
                                    {seriesDraft.map((s, idx) => (
                                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-2 text-sm text-gray-700">{idx + 1}</div>
                                        <input
                                          type="number"
                                          min="0"
                                          value={s.repeticoes ?? ''}
                                          onChange={e => updateDraftSerie(idx, 'repeticoes', e.target.value)}
                                          className="col-span-4 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                          placeholder="12"
                                        />
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.5"
                                          value={s.peso ?? ''}
                                          onChange={e => updateDraftSerie(idx, 'peso', e.target.value)}
                                          className="col-span-5 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                                          placeholder="0"
                                        />
                                        <button
                                          onClick={() => removeDraftSerie(idx)}
                                          disabled={seriesDraft.length <= 1}
                                          className="col-span-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                                          title="Remover série"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      onClick={addDraftSerie}
                                      className="w-full text-xs text-gray-600 hover:text-gray-900 py-1.5 border border-dashed border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> Adicionar série
                                    </button>
                                    <div className="flex justify-end gap-2 pt-2">
                                      <button
                                        onClick={cancelEditSeries}
                                        className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={saveEditSeries}
                                        disabled={seriesDraft.length === 0}
                                        className="px-3 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                      >
                                        <Check className="w-3 h-3" /> Salvar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              );
                            })}
                            
                            {/* Botão Adicionar Exercício */}
                            <button
                              onClick={() => handleAddExercise(index)}
                              className="bg-white border-2 border-dashed border-gray-300 p-4 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-gray-900 min-h-[120px]"
                            >
                              <Plus className="w-6 h-6" />
                              <span className="text-sm font-medium">Adicionar Exercício</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum treino encontrado</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Adicionar Exercício */}
      <AddExerciseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedDayIndex(null);
        }}
        onConfirm={handleConfirmAddExercise}
      />
    </div>
  );
}