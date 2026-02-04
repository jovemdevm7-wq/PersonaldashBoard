import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { pendingId } = await request.json();

    if (!pendingId) {
      return NextResponse.json(
        { error: 'ID do treino pendente é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar dados do treino pendente
    const pendingRef = database.ref(`pendentes/${pendingId}`);
    const snapshot = await pendingRef.once('value');
    const pendingData = snapshot.val();

    if (!pendingData) {
      return NextResponse.json(
        { error: 'Treino pendente não encontrado' },
        { status: 404 }
      );
    }

    // Salvar no usuário original usando a estrutura correta
    const userRef = database.ref(`users/${pendingData.userId}`);
    await userRef.child('Treino').update({
      treino: pendingData.treinoData
    });

    // Remover da lista de pendentes
    await pendingRef.remove();

    return NextResponse.json({ 
      success: true, 
      message: 'Treino aprovado e aplicado ao usuário' 
    });

  } catch (error) {
    console.error('Erro ao aprovar treino:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}