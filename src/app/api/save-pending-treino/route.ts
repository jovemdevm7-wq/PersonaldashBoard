import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { uuid, email, treino } = await request.json();

    if (!uuid || !email || !treino) {
      return NextResponse.json(
        { error: 'UUID, email e treino são obrigatórios' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const pendingId = `${Date.now()}_${uuid}`;

    // Salvar treino pendente
    await database.ref(`pendentes/${pendingId}`).set({
      userId: uuid,
      email: email,
      timestamp: timestamp,
      treinoData: treino,
      status: 'pending'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Treino enviado para aprovação',
      pendingId 
    });

  } catch (error) {
    console.error('Erro ao salvar treino pendente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}