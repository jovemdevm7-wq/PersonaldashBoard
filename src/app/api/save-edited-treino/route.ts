import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/firebase-admin';

export async function PUT(request: NextRequest) {
  try {
    const { uuid, treino, pendingId } = await request.json();

    if (!uuid || !treino || !pendingId) {
      return NextResponse.json(
        { error: 'UUID, treino e pendingId são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar se treino tem estrutura válida
    if (!Array.isArray(treino)) {
      return NextResponse.json(
        { error: 'Treino deve ser um array' },
        { status: 400 }
      );
    }

    // Salvar treino no usuário
    const userRef = database.ref(`users/${uuid}`);
    await userRef.child('Treino').update({
      treino: treino
    });

    // Remover da lista de pendentes
    const pendingRef = database.ref(`pendentes/${pendingId}`);
    await pendingRef.remove();

    return NextResponse.json({ 
      success: true,
      message: 'Treino editado e aplicado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao salvar treino editado:', error);
    
    return NextResponse.json(
      { 
        error: `Erro interno do servidor: ${error?.message || 'Erro desconhecido'}`
      },
      { status: 500 }
    );
  }
}