/**
 * MEUULTRASSOM — SISTEMA DE LAUDOS ESTRUTURADOS DE ULTRASSONOGRAFIA
 * Script Principal (Etapa 1: Página Inicial)
 * 
 * Responsabilidades:
 * - Alternância e persistência de Tema Claro/Escuro
 * - Seleção interativa dos 3 tipos de exames
 * - Alternância exclusiva entre DUM e 1º Ultrassom
 * - Máscara automática de datas (DD/MM/AAAA)
 * - Cálculos matemáticos precisos de idade gestacional (dias e semanas)
 * - Validações de data e limites biológicos
 * - Atualização em tempo real da exibição da IG
 * - Ações do botão Prosseguir e estrutura de navegação
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. ESTADO DA APLICAÇÃO
  // =========================================================================
  const state = {
    selectedExam: null, // 'inicial' | 'simples' | 'doppler'
    activeMethod: 'dum', // 'dum' | 'usg'
    selectedWeek: null, // 16 .. 41
    suggestedWeek: null, // semana sugerida pelo cálculo automático
    igResult: {
      valid: false,
      semanas: 0,
      dias: 0,
      diasTotais: 0,
      dpp: null,
      erro: null,
      metodo: 'DUM'
    },
    navigationData: null
  };

  // =========================================================================
  // 2. REFERÊNCIAS DO DOM
  // =========================================================================
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');
  const currentDateEl = document.getElementById('currentDateText');

  const examCards = document.querySelectorAll('.exam-card');
  const methodTabs = document.querySelectorAll('.method-tab-btn');
  const methodViews = {
    dum: document.getElementById('methodViewDum'),
    usg: document.getElementById('methodViewUsg')
  };

  // Campos DUM
  const inputDum = document.getElementById('inputDum');

  // Campos 1º Ultrassom
  const inputUsgDate = document.getElementById('inputUsgDate');
  const inputUsgWeeks = document.getElementById('inputUsgWeeks');
  const inputUsgDays = document.getElementById('inputUsgDays');

  // Área de exibição da Idade Gestacional
  const igResultCard = document.getElementById('igResultCard');
  const igMainValue = document.getElementById('igMainValue');
  const igMethodBadge = document.getElementById('igMethodBadge');
  const igExtraDetails = document.getElementById('igExtraDetails');
  const igDaysTotalText = document.getElementById('igDaysTotalText');
  const igDppText = document.getElementById('igDppText');
  const igTrimesterText = document.getElementById('igTrimesterText');

  // Ação principal (Prosseguir)
  const btnProceed = document.getElementById('btnProceed');
  const actionStatusMsg = document.getElementById('actionStatusMsg');

  // Modal de Seleção de Semanas (16 a 41 semanas)
  const weekModalOverlay = document.getElementById('weekModalOverlay');
  const weekModalCloseBtn = document.getElementById('weekModalCloseBtn');
  const weekModalCancelBtn = document.getElementById('weekModalCancelBtn');
  const weekModalConfirmBtn = document.getElementById('weekModalConfirmBtn');
  const weekModalExamBadge = document.getElementById('weekModalExamBadge');
  const weekSuggestedNotice = document.getElementById('weekSuggestedNotice');
  const weekSuggestedText = document.getElementById('weekSuggestedText');
  const weekSelectionFeedback = document.getElementById('weekSelectionFeedback');
  const weekBtns = document.querySelectorAll('.week-btn');

  // Modal de navegação e transição de destino
  const modalOverlay = document.getElementById('navModalOverlay');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalOkBtn = document.getElementById('modalOkBtn');
  const modalTitle = document.getElementById('modalTitle');
  const modalBadge = document.getElementById('modalBadge');
  const modalMessage = document.getElementById('modalMessage');
  const summaryExamType = document.getElementById('summaryExamType');
  const summaryMethod = document.getElementById('summaryMethod');
  const summaryIG = document.getElementById('summaryIG');
  const summaryTarget = document.getElementById('summaryTarget');

  // =========================================================================
  // 3. INICIALIZAÇÃO DE DATA ATUAL E TEMA
  // =========================================================================
  function initSystemDate() {
    const today = new Date();
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const dateFormatted = today.toLocaleDateString('pt-BR', options);
    if (currentDateEl) {
      currentDateEl.textContent = dateFormatted;
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('meuultrassom_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.body.classList.add('dark-mode');
      updateThemeIcons(true);
    } else {
      document.body.classList.remove('dark-mode');
      updateThemeIcons(false);
    }
  }

  function updateThemeIcons(isDark) {
    if (themeIconSun && themeIconMoon) {
      if (isDark) {
        themeIconSun.style.display = 'block';
        themeIconMoon.style.display = 'none';
      } else {
        themeIconSun.style.display = 'none';
        themeIconMoon.style.display = 'block';
      }
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('meuultrassom_theme', isDark ? 'dark' : 'light');
      updateThemeIcons(isDark);
    });
  }

  // =========================================================================
  // 4. MÁSCARA AUTOMÁTICA DE DATAS (DD/MM/AAAA)
  // =========================================================================
  function applyDateMask(input) {
    if (!input) return;

    input.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, ''); // apenas números
      if (value.length > 8) {
        value = value.substring(0, 8);
      }

      if (value.length > 4) {
        e.target.value = `${value.substring(0, 2)}/${value.substring(2, 4)}/${value.substring(4)}`;
      } else if (value.length > 2) {
        e.target.value = `${value.substring(0, 2)}/${value.substring(2)}`;
      } else {
        e.target.value = value;
      }

      // Dispara recálculo da idade gestacional
      handleCalculation();
    });

    // Tratamento ao colar
    input.addEventListener('paste', () => {
      setTimeout(() => {
        let value = input.value.replace(/\D/g, '');
        if (value.length > 8) value = value.substring(0, 8);
        if (value.length >= 8) {
          input.value = `${value.substring(0, 2)}/${value.substring(2, 4)}/${value.substring(4)}`;
        }
        handleCalculation();
      }, 10);
    });
  }

  applyDateMask(inputDum);
  applyDateMask(inputUsgDate);

  // =========================================================================
  // 5. SELEÇÃO DO TIPO DE EXAME
  // =========================================================================
  examCards.forEach(card => {
    card.addEventListener('click', () => {
      const examType = card.getAttribute('data-exam');
      selectExam(examType);
    });

    // Acessibilidade por teclado (Enter / Espaço)
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const examType = card.getAttribute('data-exam');
        selectExam(examType);
      }
    });
  });

  function selectExam(examType) {
    state.selectedExam = examType;

    examCards.forEach(card => {
      const isCurrent = card.getAttribute('data-exam') === examType;
      card.classList.toggle('selected', isCurrent);
      card.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });

    clearActionStatus();
    updateResultDisplay();
  }

  // =========================================================================
  // 6. ALTERNÂNCIA ENTRE MÉTODOS (DUM vs 1º ULTRASSOM)
  // =========================================================================
  methodTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const method = tab.getAttribute('data-method');
      switchMethod(method);
    });
  });

  function switchMethod(method) {
    if (state.activeMethod === method) return;
    state.activeMethod = method;

    // Atualiza classes das abas
    methodTabs.forEach(tab => {
      const isActive = tab.getAttribute('data-method') === method;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Alterna visualização e desabilita campos do método inativo
    if (method === 'dum') {
      methodViews.dum.classList.add('active');
      methodViews.usg.classList.remove('active');

      inputDum.disabled = false;
      inputUsgDate.disabled = true;
      inputUsgWeeks.disabled = true;
      inputUsgDays.disabled = true;
    } else {
      methodViews.dum.classList.remove('active');
      methodViews.usg.classList.add('active');

      inputDum.disabled = true;
      inputUsgDate.disabled = false;
      inputUsgWeeks.disabled = false;
      inputUsgDays.disabled = false;
    }

    clearActionStatus();
    handleCalculation();
  }

  // Ouvintes para campos numéricos do 1º Ultrassom
  if (inputUsgWeeks) {
    inputUsgWeeks.addEventListener('input', handleCalculation);
  }
  if (inputUsgDays) {
    inputUsgDays.addEventListener('input', handleCalculation);
  }

  // =========================================================================
  // 7. VALIDAÇÃO DE DATA E CÁLCULOS MATEMÁTICOS DE IDADE GESTACIONAL
  // =========================================================================
  
  /**
   * Converte texto "DD/MM/AAAA" em objeto Date zerado nas horas.
   * Retorna null se formato for inválido.
   */
  function parseDateBR(dateStr) {
    if (!dateStr || dateStr.length !== 10) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexado
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (year < 1900 || year > 2100) return null;
    if (month < 0 || month > 11) return null;

    const date = new Date(year, month, day, 0, 0, 0, 0);

    // Verifica se dia é válido para o mês especificado (ex: 31/02 não vira 03/03)
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
      return null;
    }

    return date;
  }

  /**
   * Normaliza uma data para início do dia (00:00:00).
   */
  function getMidnightDate(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  /**
   * Formata objeto Date para "DD/MM/AAAA".
   */
  function formatDateBR(date) {
    if (!date || isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Calcula a diferença exata em dias inteiros entre duas datas (Data2 - Data1).
   */
  function diffInDays(date1, date2) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.floor((utc2 - utc1) / msPerDay);
  }

  /**
   * CÁLCULO OPÇÃO A: DUM
   */
  function calculateByDum(dumString) {
    if (!dumString || dumString.length < 10) {
      return { valid: false, erro: null }; // Ainda digitando
    }

    const dumDate = parseDateBR(dumString);
    if (!dumDate) {
      return { valid: false, erro: 'Data da menstruação inválida.' };
    }

    const today = getMidnightDate();
    const daysElapsed = diffInDays(dumDate, today);

    if (daysElapsed < 0) {
      return { valid: false, erro: 'A DUM não pode ser uma data futura.' };
    }

    // Limite biológico gestacional razoável (máximo 44 semanas = 308 dias)
    if (daysElapsed > 315) {
      return { valid: false, erro: 'A data informada ultrapassa o período gestacional plausível (máx. 44 semanas).' };
    }

    const semanas = Math.floor(daysElapsed / 7);
    const dias = daysElapsed % 7;

    // Regra de Naegele: DUM + 280 dias
    const dppDate = new Date(dumDate.getTime() + (280 * 24 * 60 * 60 * 1000));

    return {
      valid: true,
      semanas,
      dias,
      diasTotais: daysElapsed,
      dpp: formatDateBR(dppDate),
      erro: null,
      metodo: 'DUM'
    };
  }

  /**
   * CÁLCULO OPÇÃO B: PRIMEIRO ULTRASSOM
   * Preserva rigorosamente os dias sem arredondamento.
   */
  function calculateByUsg(usgDateStr, weeksStr, daysStr) {
    if (!usgDateStr || usgDateStr.length < 10) {
      return { valid: false, erro: null }; // Aguardando data
    }

    const usgDate = parseDateBR(usgDateStr);
    if (!usgDate) {
      return { valid: false, erro: 'Data do primeiro ultrassom inválida.' };
    }

    const today = getMidnightDate();
    const daysElapsed = diffInDays(usgDate, today);

    if (daysElapsed < 0) {
      return { valid: false, erro: 'A data do 1º exame não pode ser no futuro.' };
    }

    const initialWeeks = parseInt(weeksStr, 10);
    const initialDays = parseInt(daysStr, 10);

    if (isNaN(initialWeeks) || initialWeeks < 0) {
      return { valid: false, erro: 'Informe as semanas de gestação no 1º exame.' };
    }

    if (isNaN(initialDays) || initialDays < 0 || initialDays > 6) {
      return { valid: false, erro: 'Os dias devem estar entre 0 e 6.' };
    }

    // Dias totais na data do exame inicial
    const baseDays = (initialWeeks * 7) + initialDays;

    // Idade gestacional atual em dias
    const totalCurrentDays = baseDays + daysElapsed;

    if (totalCurrentDays > 315) {
      return { valid: false, erro: 'A idade gestacional calculada ultrapassa 44 semanas.' };
    }

    const currentWeeks = Math.floor(totalCurrentDays / 7);
    const currentDays = totalCurrentDays % 7;

    // DPP correspondente (280 dias a partir da DUM teórica)
    // Dias restantes até 40 semanas (280 dias):
    const daysUntil40Weeks = 280 - totalCurrentDays;
    const dppDate = new Date(today.getTime() + (daysUntil40Weeks * 24 * 60 * 60 * 1000));

    return {
      valid: true,
      semanas: currentWeeks,
      dias: currentDays,
      diasTotais: totalCurrentDays,
      dpp: formatDateBR(dppDate),
      erro: null,
      metodo: '1º Ultrassom'
    };
  }

  /**
   * Manipulador central de cálculo
   */
  function handleCalculation() {
    let result = { valid: false, erro: null };

    if (state.activeMethod === 'dum') {
      result = calculateByDum(inputDum ? inputDum.value.trim() : '');
    } else {
      const dateVal = inputUsgDate ? inputUsgDate.value.trim() : '';
      const weeksVal = inputUsgWeeks ? inputUsgWeeks.value.trim() : '';
      const daysVal = inputUsgDays ? inputUsgDays.value.trim() : '0';
      result = calculateByUsg(dateVal, weeksVal, daysVal);
    }

    state.igResult = result;
    updateResultDisplay();
  }

  // =========================================================================
  // 8. APRESENTAÇÃO VISUAL DA IDADE GESTACIONAL (DISPLAY DE DESTAQUE)
  // =========================================================================
  function updateResultDisplay() {
    const res = state.igResult;

    if (!igResultCard || !igMainValue) return;

    // Reset de classes
    igResultCard.classList.remove('has-result', 'is-invalid');

    if (res.erro) {
      // Estado de erro
      igResultCard.classList.add('is-invalid');
      igMainValue.innerHTML = `<span class="ig-error-value">${res.erro}</span>`;
      if (igMethodBadge) igMethodBadge.textContent = state.activeMethod === 'dum' ? 'DUM' : '1º Ultrassom';
      if (igExtraDetails) igExtraDetails.style.display = 'none';
      return;
    }

    if (!res.valid) {
      // Estado vazio / aguardando preenchimento
      igMainValue.innerHTML = `<span class="ig-empty-value">Aguardando preenchimento dos dados...</span>`;
      if (igMethodBadge) igMethodBadge.textContent = state.activeMethod === 'dum' ? 'DUM' : '1º Ultrassom';
      if (igExtraDetails) igExtraDetails.style.display = 'none';
      return;
    }

    // Estado de sucesso com resultado válido
    igResultCard.classList.add('has-result');

    const semanaStr = res.semanas === 1 ? '1 semana' : `${res.semanas} semanas`;
    const diaStr = res.dias === 1 ? '1 dia' : `${res.dias} dias`;
    const formattedIG = `${semanaStr} e ${diaStr}`;

    igMainValue.textContent = formattedIG;

    if (igMethodBadge) {
      igMethodBadge.textContent = `Via ${res.metodo}`;
    }

    if (igExtraDetails) {
      igExtraDetails.style.display = 'flex';

      if (igDaysTotalText) {
        igDaysTotalText.textContent = `${res.diasTotais} dias`;
      }

      if (igDppText) {
        igDppText.textContent = res.dpp || '—';
      }

      if (igTrimesterText) {
        if (res.semanas < 14) {
          igTrimesterText.textContent = '1º Trimestre';
        } else if (res.semanas < 28) {
          igTrimesterText.textContent = '2º Trimestre';
        } else {
          igTrimesterText.textContent = '3º Trimestre';
        }
      }
    }
  }

  // =========================================================================
  // 9. NOVO FLUXO DE NAVEGAÇÃO E JANELA DE SELEÇÃO DE SEMANAS (ETAPA 2)
  // =========================================================================
  
  // Nomes amigáveis dos exames
  const examTitles = {
    inicial: 'Obstétrico Inicial',
    simples: 'Obstétrico Simples',
    doppler: 'Obstétrico com Doppler'
  };

  // Ouvinte do botão principal PROSSEGUIR na página
  if (btnProceed) {
    btnProceed.addEventListener('click', handleProceed);
  }

  // Botão PROSSEGUIR RÁPIDO (abaixo dos cards, sem exigir IG)
  const btnProceedQuick = document.getElementById('btnProceedQuick');
  const actionStatusMsgQuick = document.getElementById('actionStatusMsgQuick');

  if (btnProceedQuick) {
    btnProceedQuick.addEventListener('click', () => {
      // Reutiliza a mesma lógica principal, apenas usando o feedback do botão rápido
      if (!state.selectedExam) {
        if (actionStatusMsgQuick) {
          actionStatusMsgQuick.textContent = 'Selecione uma das modalidades acima para prosseguir.';
          actionStatusMsgQuick.className = 'action-status-msg error';
          setTimeout(() => {
            actionStatusMsgQuick.textContent = '';
            actionStatusMsgQuick.className = 'action-status-msg';
          }, 3500);
        }
        const examSection = document.getElementById('examSection');
        if (examSection) examSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      // Limpa feedback do botão rápido e reutiliza handleProceed
      if (actionStatusMsgQuick) {
        actionStatusMsgQuick.textContent = '';
        actionStatusMsgQuick.className = 'action-status-msg';
      }
      handleProceed();
    });
  }

  /**
   * Manipulador do botão principal "PROSSEGUIR"
   * A identificação gestacional por DUM ou 1º US é totalmente OPCIONAL!
   */
  function handleProceed() {
    clearActionStatus();

    // 1. Validar se uma das 3 modalidades foi selecionada
    if (!state.selectedExam) {
      showActionStatus('Por favor, selecione uma das 3 modalidades de exame acima.', 'error');
      const examSection = document.getElementById('examSection');
      if (examSection) {
        examSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 2. Se houver erro de data digitada (ex: data no futuro), avisar o usuário
    if (state.igResult.erro) {
      showActionStatus(`Atenção no preenchimento da datação: ${state.igResult.erro}`, 'warning');
    }

    // 3. FLUXO A: Obstétrico Inicial -> Vai direto ao módulo inicial (sem exigir semanas nem DUM)
    if (state.selectedExam === 'inicial') {
      const payload = {
        tipoExame: 'inicial',
        nomeExame: 'Obstétrico Inicial',
        semanaSelecionada: state.igResult.valid ? state.igResult.semanas : null,
        mascaraDestino: 'laudo_inicial.html',
        nomeMascara: 'Módulo Obstétrico Inicial (1º Trimestre)',
        igCalculada: state.igResult.valid ? { ...state.igResult } : null,
        metodoDatação: state.igResult.valid ? state.igResult.metodo : 'Não informada (Opcional)',
        timestamp: new Date().toISOString()
      };

      state.navigationData = payload;
      try {
        sessionStorage.setItem('meuultrassom_nav_data', JSON.stringify(payload));
      } catch (e) {}

      // Navegar diretamente para o módulo Obstétrico Inicial
      window.location.href = 'laudo_inicial.html';
      return;
    }

    // 4. FLUXO B: Obstétrico Simples -> Navega diretamente para o laudo_simples.html (sem solicitar semana prévia)
    if (state.selectedExam === 'simples') {
      const payload = {
        tipoExame: 'simples',
        nomeExame: 'Obstétrico Simples',
        mascaraDestino: 'laudo_simples.html',
        nomeMascara: 'Módulo Obstétrico Simples (16 a 41 semanas)',
        timestamp: new Date().toISOString()
      };

      state.navigationData = payload;
      try {
        sessionStorage.setItem('meuultrassom_nav_data', JSON.stringify(payload));
      } catch (e) {}

      // Navegar diretamente para o módulo Obstétrico Simples
      window.location.href = 'laudo_simples.html';
      return;
    }

    // 5. FLUXO C: Obstétrico com Doppler -> Navega diretamente para o laudo_doppler.html (sem solicitar semana prévia)
    if (state.selectedExam === 'doppler') {
      const payload = {
        tipoExame: 'doppler',
        nomeExame: 'Obstétrico com Doppler',
        mascaraDestino: 'laudo_doppler.html',
        nomeMascara: 'Módulo Obstétrico com Doppler (16 a 41 semanas)',
        igCalculada: state.igResult.valid ? { ...state.igResult } : null,
        metodoDatação: state.igResult.valid ? state.igResult.metodo : null,
        timestamp: new Date().toISOString()
      };

      state.navigationData = payload;
      try {
        sessionStorage.setItem('meuultrassom_nav_data', JSON.stringify(payload));
      } catch (e) {}

      // Navegar diretamente para o módulo Obstétrico com Doppler
      window.location.href = 'laudo_doppler.html';
      return;
    }
  }

  /**
   * Abre a Janela / Modal de Seleção de Semanas (16 a 41 semanas)
   */
  function openWeekModal() {
    if (!weekModalOverlay) return;

    // Atualiza badge com o exame selecionado
    if (weekModalExamBadge) {
      weekModalExamBadge.textContent = examTitles[state.selectedExam] || 'Exame Obstétrico';
      if (state.selectedExam === 'doppler') {
        weekModalExamBadge.style.background = 'linear-gradient(135deg, rgba(60,212,216,0.25), rgba(239,72,168,0.2))';
        weekModalExamBadge.style.borderColor = 'rgba(239,72,168,0.35)';
      } else {
        weekModalExamBadge.style.background = '';
        weekModalExamBadge.style.borderColor = '';
      }
    }

    // Limpa destaque de sugestão anterior em todos os botões
    weekBtns.forEach(btn => {
      btn.classList.remove('suggested');
    });

    // Verifica se há idade gestacional calculada pela DUM ou 1º US
    if (state.igResult.valid) {
      const calcWeeks = state.igResult.semanas;
      
      // Se estiver no intervalo de 16 a 41 semanas, sugere e pré-seleciona
      if (calcWeeks >= 16 && calcWeeks <= 41) {
        state.suggestedWeek = calcWeeks;

        // Marca visualmente o botão como sugerido
        const suggestedBtn = document.querySelector(`.week-btn[data-week="${calcWeeks}"]`);
        if (suggestedBtn) {
          suggestedBtn.classList.add('suggested');
        }

        // Pré-seleciona a semana calculada
        selectWeek(calcWeeks, true);

        // Exibe o banner informativo com a sugestão
        if (weekSuggestedNotice && weekSuggestedText) {
          weekSuggestedNotice.style.display = 'flex';
          weekSuggestedText.textContent = `Idade gestacional calculada: ${state.igResult.semanas} semanas e ${state.igResult.dias} dias (${state.igResult.metodo}). Semana ${calcWeeks} sugerida. Confirme ou escolha outra semana.`;
        }
      } else {
        // Idade calculada fora do intervalo (ex: < 16 ou > 41)
        state.suggestedWeek = null;
        if (weekSuggestedNotice && weekSuggestedText) {
          weekSuggestedNotice.style.display = 'flex';
          const motivo = calcWeeks < 16 ? 'inferior a 16 semanas' : 'superior a 41 semanas';
          weekSuggestedText.textContent = `A idade gestacional calculada (${calcWeeks} sem e ${state.igResult.dias} d) é ${motivo}. Selecione manualmente a semana desejada abaixo.`;
        }
        // Se ainda não escolheu manualmente, limpa
        if (!state.selectedWeek || state.selectedWeek < 16 || state.selectedWeek > 41) {
          clearWeekSelection();
        }
      }
    } else {
      // Nenhum dado de datação informado (OPCIONAL)
      state.suggestedWeek = null;
      if (weekSuggestedNotice) {
        weekSuggestedNotice.style.display = 'none';
      }
      // Se não havia selecionado previamente, inicia neutro
      if (!state.selectedWeek) {
        clearWeekSelection();
      }
    }

    weekModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Fecha a Janela de Seleção de Semanas e retorna à página principal
   */
  function closeWeekModal() {
    if (!weekModalOverlay) return;
    weekModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Limpa a seleção de semana na grade
   */
  function clearWeekSelection() {
    state.selectedWeek = null;
    weekBtns.forEach(btn => {
      btn.classList.remove('selected');
      btn.setAttribute('aria-checked', 'false');
    });
    if (weekSelectionFeedback) {
      weekSelectionFeedback.innerHTML = '<span class="week-feedback-placeholder">Nenhuma semana selecionada. Clique na semana desejada acima.</span>';
    }
  }

  /**
   * Seleciona uma semana na grade (16 a 41)
   * A seleção manual do usuário prevalece sempre!
   */
  function selectWeek(weekNumber, isSuggested = false) {
    const week = parseInt(weekNumber, 10);
    if (isNaN(week) || week < 16 || week > 41) return;

    state.selectedWeek = week;

    weekBtns.forEach(btn => {
      const btnWeek = parseInt(btn.getAttribute('data-week'), 10);
      const isCurrent = btnWeek === week;
      btn.classList.toggle('selected', isCurrent);
      btn.setAttribute('aria-checked', isCurrent ? 'true' : 'false');
    });

    if (weekSelectionFeedback) {
      const tagSugerida = isSuggested 
        ? ' <span style="font-size:0.78rem; font-weight:700; color:#EF48A8; text-transform:uppercase; margin-left:6px;">(Sugerida)</span>' 
        : '';
      weekSelectionFeedback.innerHTML = `<span class="week-feedback-active">Semana selecionada: <strong>${week} semanas</strong>${tagSugerida}</span>`;
    }
  }

  /**
   * Confirma a seleção de semana e prepara o direcionamento para a máscara
   */
  function confirmWeekSelection() {
    // Validação obrigatória da semana
    if (!state.selectedWeek) {
      if (weekSelectionFeedback) {
        weekSelectionFeedback.innerHTML = '<span style="color:#dc2626; font-weight:700;">Por favor, selecione uma semana de 16 a 41 acima para prosseguir.</span>';
      }
      return;
    }

    const examTitle = examTitles[state.selectedExam];
    const week = state.selectedWeek;
    
    // Mapeamento rigoroso do arquivo e da máscara
    const mascaraDestino = state.selectedExam === 'simples'
      ? 'laudo_simples.html'
      : 'laudo_doppler.html';

    const nomeMascara = state.selectedExam === 'simples'
      ? `Máscara Obstétrica Simples — Semana ${week}`
      : `Máscara Obstétrica com Doppler — Semana ${week}`;

    const metodoTexto = state.igResult.valid 
      ? state.igResult.metodo 
      : 'Seleção Manual Direta';

    const igDisplay = state.igResult.valid
      ? `${state.igResult.semanas} semanas e ${state.igResult.dias} dias (${state.igResult.metodo})`
      : `${week} semanas (Definida manualmente)`;

    // Estrutura de dados pronta para ser utilizada na máscara correspondente
    const payload = {
      tipoExame: state.selectedExam,
      nomeExame: examTitle,
      semanaSelecionada: week,
      mascaraDestino: mascaraDestino,
      nomeMascara: nomeMascara,
      igCalculada: state.igResult.valid ? { ...state.igResult } : null,
      metodoDatação: metodoTexto,
      timestamp: new Date().toISOString()
    };

    state.navigationData = payload;
    try {
      sessionStorage.setItem('meuultrassom_nav_data', JSON.stringify(payload));
    } catch (e) {}

    // Fecha o modal de semanas e navega diretamente para a máscara correspondente
    closeWeekModal();

    // Navega diretamente para a máscara de destino (sem abrir navModal intermediário)
    window.location.href = mascaraDestino;
  }

  // Ouvintes de eventos da grade de semanas
  weekBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const week = btn.getAttribute('data-week');
      selectWeek(week, false);
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const week = btn.getAttribute('data-week');
        selectWeek(week, false);
      }
    });
  });

  // Ouvintes dos botões do Modal de Semanas
  if (weekModalCloseBtn) weekModalCloseBtn.addEventListener('click', closeWeekModal);
  if (weekModalCancelBtn) weekModalCancelBtn.addEventListener('click', closeWeekModal);
  if (weekModalConfirmBtn) weekModalConfirmBtn.addEventListener('click', confirmWeekSelection);
  if (weekModalOverlay) {
    weekModalOverlay.addEventListener('click', (e) => {
      if (e.target === weekModalOverlay) closeWeekModal();
    });
  }

  function focusActiveDateField() {
    if (state.activeMethod === 'dum') {
      if (inputDum) inputDum.focus();
    } else {
      if (inputUsgDate) inputUsgDate.focus();
    }
  }

  function showActionStatus(msg, type = 'info') {
    if (!actionStatusMsg) return;
    actionStatusMsg.textContent = msg;
    actionStatusMsg.className = `action-status-msg ${type}`;
  }

  function clearActionStatus() {
    if (!actionStatusMsg) return;
    actionStatusMsg.textContent = '';
    actionStatusMsg.className = 'action-status-msg';
  }

  // =========================================================================
  // 10. MODAL DE NAVEGAÇÃO E TRANSIÇÃO DE DESTINO
  // =========================================================================
  function openNavigationModal({ type, title, examName, method, ig, target, message }) {
    if (!modalOverlay) return;

    if (modalTitle) modalTitle.textContent = title;
    if (summaryExamType) summaryExamType.textContent = examName;
    if (summaryMethod) summaryMethod.textContent = method;
    if (summaryIG) summaryIG.textContent = ig;
    if (summaryTarget) summaryTarget.textContent = target;
    if (modalMessage) modalMessage.textContent = message;

    if (modalBadge) {
      modalBadge.className = `modal-icon-badge ${type}`;
      if (type === 'warning') {
        modalBadge.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        `;
      } else if (type === 'initial') {
        modalBadge.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        `;
      } else {
        modalBadge.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        `;
      }
    }

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeNavigationModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeNavigationModal);
  if (modalOkBtn) modalOkBtn.addEventListener('click', closeNavigationModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeNavigationModal();
    });
  }

  // Fechar modais com tecla ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (weekModalOverlay && weekModalOverlay.classList.contains('active')) {
        closeWeekModal();
      } else if (modalOverlay && modalOverlay.classList.contains('active')) {
        closeNavigationModal();
      }
    }
  });

  // =========================================================================
  // 11. INICIALIZAÇÃO GERAL E EXPOSIÇÃO PARA TESTES
  // =========================================================================
  initSystemDate();
  initTheme();
  updateResultDisplay();

  // Exportação no escopo global para viabilizar testes automatizados
  window.MeuUltrassom = {
    state,
    calculateByDum,
    calculateByUsg,
    parseDateBR,
    formatDateBR,
    diffInDays,
    selectExam,
    switchMethod,
    handleProceed,
    openWeekModal,
    closeWeekModal,
    selectWeek,
    confirmWeekSelection,
    getNavigationData: () => state.navigationData
  };
});
