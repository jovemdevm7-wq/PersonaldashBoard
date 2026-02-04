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

    // Remover da lista de pendentes
    const pendingRef = database.ref(`pendentes/${pendingId}`);
    await pendingRef.remove();

    return NextResponse.json({ 
      success: true, 
      message: 'Treino rejeitado e removido' 
    });

  } catch (error) {
    console.error('Erro ao rejeitar treino:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}