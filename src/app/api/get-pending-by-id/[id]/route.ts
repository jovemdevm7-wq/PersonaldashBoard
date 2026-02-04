import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/firebase-admin';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar treino pendente
    const pendingRef = database.ref(`pendentes/${id}`);
    const snapshot = await pendingRef.once('value');
    const pendingData = snapshot.val();

    if (!pendingData) {
      return NextResponse.json(
        { error: 'Treino pendente não encontrado' },
        { status: 404 }
      );
    }

    // Formatar dados como userData para compatibilidade
    const userData = {
      uuid: pendingData.userId,
      authData: {
        email: pendingData.email,
        emailVerified: true,
        creationTime: pendingData.timestamp,
        lastSignInTime: pendingData.timestamp,
      },
      treinoData: {
        nivel: null,
        musculo: null,
        treino: pendingData.treinoData
      }
    };

    return NextResponse.json({ userData, pendingId: id });

  } catch (error) {
    console.error('Erro ao buscar treino pendente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}