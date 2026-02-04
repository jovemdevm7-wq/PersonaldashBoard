// Função auxiliar para carregar imagem com CORS usando proxy
const loadImage = (url: string, useProxy: boolean = true): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    // Usa o proxy apenas para URLs externas (que começam com http)
    const isExternalUrl = url.startsWith('http://') || url.startsWith('https://');
    const proxyUrl = (useProxy && isExternalUrl) ? `/api/proxy-image?url=${encodeURIComponent(url)}` : url;
    img.src = proxyUrl;
  });
};

// Função auxiliar para converter imagem para Data URL
const imageToDataUrl = (img: HTMLImageElement): string | null => {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Tenta converter para Data URL, se falhar por CORS, retorna null
    try {
      return canvas.toDataURL("image/jpeg", 0.8);
    } catch (corsError) {
      console.warn("Erro de CORS ao converter imagem:", corsError);
      return null;
    }
  } catch (error) {
    console.error("Erro ao converter imagem:", error);
    return null;
  }
};

// Sort days of week in Portuguese order
export const sortDaysOfWeek = (workoutData: any): [string, any][] => {
  const order = [
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
    "Domingo",
  ];

  const formattedWorkoutData = Object.entries(workoutData).map(
    ([key, value]) => {
      const dayName = key;
      return [dayName, value] as [string, any];
    }
  );

  return formattedWorkoutData.sort(
    ([dayA], [dayB]) => order.indexOf(dayA) - order.indexOf(dayB)
  );
};

// Get BMI status message based on BMI value
export const getBmiStatusMessage = (imc: number): string => {
  if (imc < 18.5) {
    return "Abaixo do peso ideal";
  } else if (imc >= 18.5 && imc < 25) {
    return "Peso ideal";
  } else if (imc >= 25 && imc < 30) {
    return "Sobrepeso";
  } else if (imc >= 30 && imc < 35) {
    return "Obesidade grau I";
  } else if (imc >= 35 && imc < 40) {
    return "Obesidade grau II";
  } else {
    return "Obesidade grau III";
  }
};

// Função para gerar PDF sem imagens (fallback) - VERSÃO VERDE
export const generatePDFWithoutImagesGreen = async (
  currentWorkout: any,
  sortedDays: [string, any][]
) => {
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default;
  const pdf = new jsPDF("p", "mm", "a4");

  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();

  let yOffset = 0; // Começa do topo da página

  // Tentar carregar e adicionar o cabeçalho
  try {
    const headerImg = await loadImage('/cabecalho.webp', false); // Não usa proxy para arquivo local
    const headerDataUrl = imageToDataUrl(headerImg);
    
    if (headerDataUrl) {
      const headerWidth = pageWidth; // Largura total da página (sem margens)
      const headerHeight = (headerImg.height * headerWidth) / headerImg.width;
      
      // jsPDF pode não suportar WEBP diretamente, então convertemos para JPEG
      pdf.addImage(
        headerDataUrl,
        'JPEG',
        0, // x = 0 (sem margem lateral)
        0, // y = 0 (desde o topo)
        headerWidth,
        headerHeight
      );
      yOffset += headerHeight + 10; // Próximo conteúdo começa após o cabeçalho
    } else {
      yOffset = 15; // Se falhar, começa na posição padrão
    }
  } catch (error) {
    console.warn('Erro ao carregar cabeçalho:', error);
    yOffset = 15; // Se falhar, começa na posição padrão
  }

  // Título
  pdf.setFontSize(16);
  pdf.setTextColor(0, 100, 0); // Verde escuro
  pdf.text("Seu Treino Personalizado", pageWidth / 2, yOffset, {
    align: "center",
  });
  yOffset += 15;

  for (let dayIndex = 0; dayIndex < sortedDays.length; dayIndex++) {
    const [day, dayData] = sortedDays[dayIndex];
    const exercises = dayData.exercicios || dayData; // Compatibilidade com formato antigo
    const workoutName = dayData.nome || ''; // Nome do treino

    if (dayIndex > 0) {
      pdf.addPage();
      yOffset = 15;
    }

    // Formata o título: "Terça - Costas e Biceps" ou só "Terça" se não tiver nome
    const dayTitle = day.charAt(0).toUpperCase() + day.slice(1);
    const fullTitle = workoutName ? `${dayTitle} - ${workoutName}` : dayTitle;

    // Título do dia com fundo verde claro
    pdf.setFillColor(180, 255, 180); // Verde claro
    pdf.rect(margin - 5, yOffset - 8, pageWidth - margin * 2 + 10, 12, "F");

    pdf.setFontSize(14);
    pdf.setTextColor(0, 100, 0); // Verde escuro
    pdf.text(fullTitle, margin, yOffset);
    yOffset += 10;

    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      const exerciseName =
        exercise.exercise?.exercicio || "Exercício não especificado";

      // Nome do exercício
      pdf.setFontSize(12);
      pdf.setTextColor(0, 100, 0); // Verde escuro
      pdf.text(exerciseName, margin, yOffset);
      yOffset += 6;

      // Descrição (se disponível)
      if (exercise.exercise?.description) {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        const description = exercise.exercise.description;
        const splitDescription = pdf.splitTextToSize(
          description,
          pageWidth - margin * 2
        );
        pdf.text(splitDescription, margin, yOffset);
        yOffset += splitDescription.length * 4 + 2;
      }

      // Detalhes do exercício
      pdf.setFontSize(10);
      pdf.setTextColor(50, 50, 50);

      if (exercise.group === "Cardio") {
        pdf.text(
          `Duração: ${exercise.duration || exercise.reps}`,
          margin,
          yOffset
        );
      } else {
        pdf.text(
          `${exercise.sets || "-"} séries x ${exercise.reps || "-"} repetições`,
          margin,
          yOffset
        );
      }

      yOffset += 8;

      // Linha separadora entre exercícios
      if (i < exercises.length - 1) {
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.1);
        pdf.line(margin + 5, yOffset - 4, pageWidth - margin - 5, yOffset - 4);
        yOffset += 2;
      }
    }

    // Linha separadora entre dias
    if (dayIndex < sortedDays.length - 1) {
      yOffset += 15;
      pdf.setDrawColor(34, 139, 34, 0.5); // Verde
      pdf.setLineWidth(0.5);
      pdf.line(margin, yOffset - 8, pageWidth - margin, yOffset - 8);
    }
  }

  return pdf;
};

// Generate PDF content for workout with images - VERSÃO VERDE
export const generateWorkoutPDFGreen = async (
  currentWorkout: any,
  sortedDays: [string, any][]
) => {
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default;
  const pdf = new jsPDF("p", "mm", "a4");

  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  let yOffset = 0; // Começa do topo da página
  let imageLoadErrors = 0;

  // Tentar carregar e adicionar o cabeçalho
  try {
    const headerImg = await loadImage('/cabecalho.webp', false); // Não usa proxy para arquivo local
    const headerDataUrl = imageToDataUrl(headerImg);
    
    if (headerDataUrl) {
      const headerWidth = pageWidth; // Largura total da página (sem margens)
      const headerHeight = (headerImg.height * headerWidth) / headerImg.width;
      
      // jsPDF pode não suportar WEBP diretamente, então convertemos para JPEG
      pdf.addImage(
        headerDataUrl,
        'JPEG',
        0, // x = 0 (sem margem lateral)
        0, // y = 0 (desde o topo)
        headerWidth,
        headerHeight
      );
      yOffset += headerHeight + 10; // Próximo conteúdo começa após o cabeçalho
    } else {
      yOffset = 15; // Se falhar, começa na posição padrão
    }
  } catch (error) {
    console.warn('Erro ao carregar cabeçalho:', error);
    yOffset = 15; // Se falhar, começa na posição padrão
  }

  // Título
  pdf.setFontSize(16);
  pdf.setTextColor(0, 100, 0); // Verde escuro
  pdf.text("Seu Treino Personalizado", pageWidth / 2, yOffset, {
    align: "center",
  });
  yOffset += 15;

  // Processa cada dia do treino
  for (let dayIndex = 0; dayIndex < sortedDays.length; dayIndex++) {
    const [day, dayData] = sortedDays[dayIndex];
    const exercises = dayData.exercicios || dayData; // Compatibilidade com formato antigo
    const workoutName = dayData.nome || ''; // Nome do treino

    // Sempre inicia um novo dia em uma nova página (exceto o primeiro dia)
    if (dayIndex > 0) {
      pdf.addPage();
      yOffset = 15;
    }

    // Formata o título: "Terça - Costas e Biceps" ou só "Terça" se não tiver nome
    const dayTitle = day.charAt(0).toUpperCase() + day.slice(1);
    const fullTitle = workoutName ? `${dayTitle} - ${workoutName}` : dayTitle;

    // Adiciona título do dia com fundo verde claro
    pdf.setFillColor(180, 255, 180); // Verde claro
    pdf.rect(margin - 5, yOffset - 8, pageWidth - margin * 2 + 10, 12, "F");

    pdf.setFontSize(14);
    pdf.setTextColor(0, 100, 0); // Verde escuro
    pdf.text(fullTitle, margin, yOffset);
    yOffset += 10;

    // Processa cada exercício do dia
    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      const exerciseName =
        exercise.exercise?.exercicio || "Exercício não especificado";

      // Calcula altura aproximada que o exercício ocupará
      let estimatedHeight = 20;

      if (exercise.exercise?.description) {
        const description = exercise.exercise.description;
        const splitDescription = pdf.splitTextToSize(
          description,
          pageWidth - margin * 2
        );
        estimatedHeight += splitDescription.length * 4;
      }

      if (exercise.exercise?.gif) {
        estimatedHeight += 60;
      }

      // Verifica se o exercício cabe na página atual
      if (yOffset + estimatedHeight > pageHeight - 15) {
        pdf.addPage();
        yOffset = 15;
      }

      // Adiciona nome do exercício
      pdf.setFontSize(12);
      pdf.setTextColor(0, 100, 0); // Verde escuro
      pdf.text(exerciseName, margin, yOffset);
      yOffset += 6;

      // Busca detalhes do exercício e adiciona a imagem
      const gifUrl = exercise.exercise?.gif;

      if (exerciseName !== "Exercício não especificado" && gifUrl) {
        try {
          const img = await loadImage(gifUrl);

          // Define dimensões da imagem proporcionalmente
          const imgWidth = 60;
          const imgHeight = (img.height * imgWidth) / img.width;

          // Converte a imagem para Data URL
          const imgData = imageToDataUrl(img);

          if (imgData) {
            // Adiciona a imagem ao PDF
            pdf.addImage(
              imgData,
              "JPEG",
              (pageWidth - imgWidth) / 2,
              yOffset,
              imgWidth,
              imgHeight
            );
            yOffset += imgHeight + 3;
          } else {
            throw new Error("Failed to convert image to data URL");
          }
        } catch (imgError) {
          imageLoadErrors++;
          console.warn(
            `Erro ao carregar imagem para ${exerciseName}:`,
            imgError
          );
          pdf.setFontSize(9);
          pdf.setTextColor(100, 100, 100);
          pdf.text("(Imagem indisponível)", margin, yOffset);
          yOffset += 5;

          // Se tivermos muitos erros de carregamento de imagem, gera PDF sem imagens
          if (imageLoadErrors > 3) {
            console.warn(
              "Muitos erros de carregamento de imagem, gerando PDF sem imagens"
            );
            return await generatePDFWithoutImagesGreen(currentWorkout, sortedDays);
          }
        }
      } else if (exerciseName !== "Exercício não especificado") {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text("(Imagem indisponível)", margin, yOffset);
        yOffset += 5;
      }

      // Adiciona descrição do exercício (se disponível)
      if (exercise.exercise?.description) {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);

        const description = exercise.exercise.description;
        const splitDescription = pdf.splitTextToSize(
          description,
          pageWidth - margin * 2
        );

        pdf.text(splitDescription, margin, yOffset);
        yOffset += splitDescription.length * 4 + 2;
      }

      // Adiciona detalhes do exercício
      pdf.setFontSize(10);
      pdf.setTextColor(50, 50, 50);

      if (exercise.group === "Cardio") {
        pdf.text(
          `Duração: ${exercise.duration || exercise.reps}`,
          margin,
          yOffset
        );
      } else {
        pdf.text(
          `${exercise.sets || "-"} séries x ${exercise.reps || "-"} repetições`,
          margin,
          yOffset
        );
      }

      yOffset += 8;

      // Adiciona linha separadora entre exercícios (exceto após o último)
      if (i < exercises.length - 1) {
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.1);
        pdf.line(margin + 5, yOffset - 4, pageWidth - margin - 5, yOffset - 4);
        yOffset += 2;
      }
    }

    // Adiciona espaço entre os dias (exceto após o último)
    if (dayIndex < sortedDays.length - 1) {
      yOffset += 15;

      // Adiciona uma linha separadora entre os dias
      pdf.setDrawColor(34, 139, 34, 0.5); // Verde
      pdf.setLineWidth(0.5);
      pdf.line(margin, yOffset - 8, pageWidth - margin, yOffset - 8);
    }
  }

  return pdf;
};
