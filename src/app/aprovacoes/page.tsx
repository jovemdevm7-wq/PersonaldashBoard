'use client';

import { useState, useEffect } from 'react';
import { Clock, User, Calendar, Dumbbell, Check, X, Eye, Edit, ArrowLeft, Lock, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PendingTreino {
  id: string;
  userId: string;
  email: string;
  timestamp: string;
  treinoData: any[];
  status: string;
}

interface ModalData {
  isOpen: boolean;
  treino: PendingTreino | null;
}

function getSeriesCount(series: any): number | string {
  if (Array.isArray(series)) return series.length;
  return series ?? 0;
}

function hasAnyPeso(series: any): boolean {
  if (!Array.isArray(series)) return false;
  return series.some((s: any) => s && typeof s === 'object' && s.peso !== undefined && s.peso !== null && s.peso !== '' && Number(s.peso) > 0);
}

function formatRepeticoes(reps: any, series?: any): string {
  if (Array.isArray(series) && series.length > 0) {
    const repsList = series.map((s: any) => s?.repeticoes ?? '');
    const pesoList = series.map((s: any) => s?.peso ?? '');
    const allRepsEqual = repsList.every((r: any) => r === repsList[0]);
    const allPesoEqual = pesoList.every((p: any) => p === pesoList[0]);
    const hasPeso = hasAnyPeso(series);

    if (allRepsEqual && allPesoEqual) {
      return hasPeso ? `${repsList[0]} reps · ${pesoList[0]}kg` : `${repsList[0]} reps`;
    }
    if (!hasPeso) {
      return `${repsList.join(' / ')} reps`;
    }
    return series.map((s: any) => {
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

export default function Aprovacoes() {
  const router = useRouter();
  const [pendentes, setPendentes] = useState<PendingTreino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalData>({ isOpen: false, treino: null });
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Estados de autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [loginData, setLoginData] = useState({ login: '', senha: '' });
  const [loginError, setLoginError] = useState('');

  const fetchPendentes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/get-pending-treinos');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar treinos pendentes');
      }
      
      setPendentes(data.pendentes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verificar autenticação ao carregar
  useEffect(() => {
    const auth = localStorage.getItem('aprovacoes_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      setShowLogin(false);
      fetchPendentes();
    } else {
      setLoading(false);
    }
  }, []);

  // Carregar pendentes apenas quando autenticado
  useEffect(() => {
    if (isAuthenticated) {
      fetchPendentes();
    }
  }, [isAuthenticated]);

  const handleAprovar = async (pendingId: string) => {
    setProcessing(pendingId);
    try {
      const response = await fetch('/api/approve-treino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao aprovar treino');
      }

      // Atualizar lista
      await fetchPendentes();
      setModal({ isOpen: false, treino: null });
      alert('Treino aprovado com sucesso!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleRejeitar = async (pendingId: string) => {
    setProcessing(pendingId);
    try {
      const response = await fetch('/api/reject-treino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao rejeitar treino');
      }

      // Atualizar lista
      await fetchPendentes();
      setModal({ isOpen: false, treino: null });
      alert('Treino rejeitado!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const diasDaSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

  // Função de login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (loginData.login === 'personal' && loginData.senha === 'personal123') {
      localStorage.setItem('aprovacoes_auth', 'true');
      setIsAuthenticated(true);
      setShowLogin(false);
    } else {
      setLoginError('Credenciais inválidas. Tente novamente.');
    }
  };

  // Função de logout
  const handleLogout = () => {
    localStorage.removeItem('aprovacoes_auth');
    setIsAuthenticated(false);
    setShowLogin(true);
    setPendentes([]);
  };

  // Tela de login
  if (showLogin && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
        {/* Botão Voltar */}
        <Link
          href="/dashboard"
          className="fixed top-4 left-4 z-50 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Lock className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-semibold text-gray-900">Acesso Restrito</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-2">
                Login
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="login"
                  value={loginData.login}
                  onChange={(e) => setLoginData(prev => ({ ...prev, login: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Digite seu login"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  id="senha"
                  value={loginData.senha}
                  onChange={(e) => setLoginData(prev => ({ ...prev, senha: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Digite sua senha"
                  required
                />
              </div>
            </div>

            {loginError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium transition-colors"
            >
              Entrar
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Sistema de aprovação de treinos
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 relative">
      {/* Botão Voltar */}
      <Link
        href="/dashboard"
        className="fixed top-4 left-4 z-50 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      {/* Botão Logout */}
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
      >
        <LogOut className="w-4 h-4" />
        Sair
      </button>

      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-8">
            <Clock className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-semibold text-gray-900">Aprovações Pendentes</h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carregando treinos pendentes...</p>
            </div>
          ) : pendentes.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhum treino pendente para aprovação</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {pendentes.map((treino) => (
                <div key={treino.id} className="bg-gray-50 border border-gray-200 p-6 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-900">{treino.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-gray-600" />
                          <span className="text-gray-600 text-sm">{formatDate(treino.timestamp)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Dumbbell className="w-4 h-4" />
                        <span>{treino.treinoData?.length || 0} dias de treino</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setModal({ isOpen: true, treino })}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver Treino
                      </button>
                      <button
                        onClick={() => router.push(`/editar-treino/${treino.id}`)}
                        className="flex items-center gap-2 px-4 py-2 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleAprovar(treino.id)}
                        disabled={processing === treino.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleRejeitar(treino.id)}
                        disabled={processing === treino.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Visualização */}
      {modal.isOpen && modal.treino && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Visualizar Treino</h2>
                <p className="text-gray-600">{modal.treino.email} - {formatDate(modal.treino.timestamp)}</p>
              </div>
              <button
                onClick={() => setModal({ isOpen: false, treino: null })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {modal.treino.treinoData?.map((dia, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-900 text-lg mb-4">
                      <span className="text-gray-600">{diasDaSemana[index]}:</span> {dia.nome}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dia.exercicios?.map((exercicio: any, exercIndex: number) => (
                        <div key={exercIndex} className="bg-white border border-gray-200 p-4 rounded-lg">
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
                              <p className="font-medium text-sm text-gray-900 mb-1">
                                {exercicio.exercicio}
                              </p>
                              <p className="text-xs text-gray-500">
                                {getSeriesCount(exercicio.series)} séries · {formatRepeticoes(exercicio.repeticoes, exercicio.series)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setModal({ isOpen: false, treino: null })}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => router.push(`/editar-treino/${modal.treino!.id}`)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => handleRejeitar(modal.treino!.id)}
                disabled={processing === modal.treino!.id}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Rejeitar
              </button>
              <button
                onClick={() => handleAprovar(modal.treino!.id)}
                disabled={processing === modal.treino!.id}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                Aprovar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}