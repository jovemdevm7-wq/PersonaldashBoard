'use client';

import { useState } from 'react';
import { Search, User, Activity, Edit3, Check, X, Calendar, Dumbbell, Trash2, Save, Plus, ArrowRight, FileDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import AddExerciseModal from '@/components/AddExerciseModal';
import { generateWorkoutPDFGreen } from '@/lib/pdf-utils';

type SerieObj = { peso?: number | string; repeticoes?: number | string };
type SeriesValue = number | string | SerieObj[];
type RepValue = number | string | SerieObj | SerieObj[];

interface Exercicio {
  exercicio: string;
  gif: string;
  repeticoes: RepValue;
  series: SeriesValue;
}

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

interface TreinoDiario {
  exercicios: Exercicio[];
  nome?: string;
  dia?: string;
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

export default function Dashboard() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingExercise, setDeletingExercise] = useState<{dayIndex: number, exerciseIndex: number} | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingNames, setEditingNames] = useState<{[key: number]: string}>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Por favor, digite um email');
      return;
    }

    setLoading(true);
    setError('');
    setUserData(null);

    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar usuário');
      }

      setUserData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
      // Atualiza apenas localmente
      const updatedUserData = { ...userData };
      if (updatedUserData.treinoData.treino) {
        updatedUserData.treinoData.treino[editingIndex].nome = editingName;
        setUserData(updatedUserData);
        
        // Registra a mudança no estado de edições
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
      // Remove apenas localmente
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

  const saveAllChanges = async () => {
    if (!userData || !hasUnsavedChanges) return;
    
    setSaving(true);
    try {
      if (userData.treinoData.treino) {
        // Limpar dados: remover exercícios null/undefined e reorganizar
        const treinoLimpo = userData.treinoData.treino.map(dia => ({
          ...dia,
          exercicios: (dia.exercicios || []).filter(exercicio => 
            exercicio !== null && 
            exercicio !== undefined && 
            exercicio.exercicio && 
            exercicio.exercicio.trim() !== ''
          )
        }));

        // Salvar como pendente ao invés de aplicar direto
        const response = await fetch('/api/save-pending-treino', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uuid: userData.uuid,
            email: userData.authData.email,
            treino: treinoLimpo
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao enviar treino para aprovação');
        }

        const result = await response.json();
        setError(''); // Limpar erros anteriores
        
        // Mostrar mensagem de sucesso
        alert(result.message || 'Treino enviado para aprovação com sucesso!');
      }

      setHasUnsavedChanges(false);
      setEditingNames({});
    } catch (err: any) {
      setError(`Erro ao enviar treino: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!userData || !userData.treinoData.treino) {
      alert('Nenhum treino disponível para gerar PDF');
      return;
    }

    setGeneratingPdf(true);
    try {
      // Converter treino para o formato esperado pela função de PDF
      const workoutData: any = {};
      const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
      
      userData.treinoData.treino.forEach((dia, index) => {
        if (!dia) return;
        
        // Se não tiver exercícios, ignoramos este dia no PDF
        if (!dia.exercicios || dia.exercicios.length === 0) return;

        const dayName = diasDaSemana[index] || `Dia ${index + 1}`;
        workoutData[dayName] = {
          nome: dia.nome, // Adiciona o nome do treino
          exercicios: (dia.exercicios || []).map(ex => ({
            exercise: {
              exercicio: ex.exercicio,
              gif: ex.gif,
              description: '' // Pode adicionar descrição se disponível
            },
            sets: getSeriesCount(ex.series),
            reps: formatRepeticoes(ex.repeticoes, ex.series),
            group: 'Strength' // Ajustar conforme necessário
          }))
        };
      });

      // Importar função de ordenação
      const { sortDaysOfWeek } = await import('@/lib/pdf-utils');
      const sortedDays = sortDaysOfWeek(workoutData);
      
      // Gerar PDF
      const pdf = await generateWorkoutPDFGreen(
        { userName: userData.authData.email.split('@')[0] },
        sortedDays
      );
      
      // Salvar PDF
      pdf.save('Treino-Nutri.pdf');
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      alert(`Erro ao gerar PDF: ${err.message}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 relative">
      {/* Botão no canto superior direito */}
      <Link
        href="/aprovacoes"
        className="fixed top-4 right-4 z-50 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
      >
        Pendentes
        <ArrowRight className="w-4 h-4" />
      </Link>

      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-gray-700" />
              <h1 className="text-3xl font-semibold text-gray-900">Dashboard de Usuários</h1>
            </div>
          </div>
          
          {/* Formulário de Busca */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email do Usuário
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Digite o email do usuário"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  <Search className="w-5 h-5" />
                  {loading ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>
          </form>

          {/* Mensagem de Erroo */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Dados do Usuário */}
          {userData && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Informações do Usuário</h2>
              
              {/* Email do Usuário */}
              <div className="bg-white border border-gray-200 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Informações do Usuário</h3>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Email:</p>
                  <p className="text-lg text-gray-900 font-medium">{userData.authData.email}</p>
                </div>
              </div>

              {/* Dados do Treino */}
              <div className="bg-white border border-gray-200 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-6">
                  <Dumbbell className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Dados do Treino</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm font-medium text-gray-600 mb-1">Nível:</p>
                    <p className="text-lg text-gray-900 font-medium">
                      {userData.treinoData.nivel || 'Não informado'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm font-medium text-gray-600 mb-1">Músculo:</p>
                    <p className="text-lg text-gray-900 font-medium">
                      {userData.treinoData.musculo || 'Não informado'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm font-medium text-gray-600 mb-1">Tipo:</p>
                    <p className="text-lg text-gray-900 font-medium">
                      {userData.treinoData.treino ? 'Personalizado' : 'Não informado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Treino Semanal */}
              <div className="bg-white border border-gray-200 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Treino Semanal</h3>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Botão Gerar PDF */}
                    <button
                      onClick={handleGeneratePDF}
                      disabled={generatingPdf || !userData.treinoData.treino}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <FileDown size={18} />
                      {generatingPdf ? 'Gerando PDF...' : 'Gerar PDF'}
                    </button>

                    {hasUnsavedChanges && (
                      <button
                        onClick={saveAllChanges}
                        disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <Save size={18} />
                        {saving ? 'Enviando...' : 'Enviar para Aprovação'}
                      </button>
                    )}
                  </div>
                </div>
                    {userData.treinoData.treino && userData.treinoData.treino.length > 0 ? (
                      <div className="space-y-4">
                        {userData.treinoData.treino.map((dia, index) => {
                          const exerciciosDoDia = dia.exercicios || [];
                          console.log(' UserData:', userData.treinoData);
                          console.log('Treino:', userData.treinoData.treino);
                          console.log('Dia:', dia);
                          const diasDaSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
                          console.log(`Dia ${index}:`, dia.nome, 'Exercicios:', exerciciosDoDia.length);
                          console.log('Primeiro exercicio:', exerciciosDoDia[0]);
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
                                      onClick={() => handleEditStart(index, dia.nome ?? '')}
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
                              {exerciciosDoDia.filter(exercicio => exercicio !== null && exercicio !== undefined).map((exercicio, exercIndex) => {
                                const isEditingThisSeries = editingSeries?.dayIndex === index && editingSeries?.exerciseIndex === exercIndex;
                                console.log('Exercicio renderizado:', exercicio.exercicio, 'GIF:', exercicio.gif);
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
                                        onLoad={() => console.log('✅ Imagem carregou:', exercicio.gif)}
                                        onError={(e) => console.log('❌ Erro ao carregar:', exercicio.gif, e)}
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
