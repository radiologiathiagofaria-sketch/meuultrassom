/**
 * MEUULTRASSOM — MÓDULO OBSTÉTRICO SIMPLES (16 A 41 SEMANAS)
 * Script Principal 100% Independente
 * 
 * Responsabilidades:
 * - Controle de tema claro/escuro persistente
 * - Gestão reativa de estado: Cronologia (DUM, 1ª USG, IG Referida), Estática (Gestação Única), BCF, Placenta, Líquido (ILA/MBV), Morfologia, Biometria e Conclusão
 * - Definição de idade gestacional de referência única e dinâmica (alimenta o laudo, tabela de ILA e percentis)
 * - Tabela dinâmica de referência de ILA Moore (16 a 41 semanas)
 * - Classificação automática e alerta visual para valores fora de referência do ILA com sincronização na Conclusão
 * - Fórmulas biométricas Hadlock (Peso fetal, percentil e índices CC/CA e DBP/DOF)
 * - Renderização em tempo real na folha A4 com estrita fidelidade aos modelos Word de 16 a 41 semanas
 * - Cópia rica para o Microsoft Word preservando 100% da formatação
 * - Botão e modal de novo exame e integração com dados de navegação da página inicial
 */

(function() {
  'use strict';

  // =========================================================================
  // 1. TABELA DE REFERÊNCIA DE ILA (MOORE ET AL.) — 16 A 41 SEMANAS
  // =========================================================================
  const TABELA_ILA_REFERENCIA = {
    16: { min: null, max: null, desc: 'Apenas descrição de normalidade (maior bolsão normal de 20 a 80 mm)' },
    17: { min: null, max: null, desc: 'Apenas descrição de normalidade (maior bolsão normal de 20 a 80 mm)' },
    18: { min: null, max: null, desc: 'Apenas descrição de normalidade (maior bolsão normal de 20 a 80 mm)' },
    19: { min: null, max: null, desc: 'Apenas descrição de normalidade (maior bolsão normal de 20 a 80 mm)' },
    20: { min: 93, max: 212 },
    21: { min: 95, max: 214 },
    22: { min: 97, max: 216 },
    23: { min: 98, max: 218 },
    24: { min: 97, max: 221 },
    25: { min: 98, max: 219 },
    26: { min: 97, max: 223 },
    27: { min: 95, max: 226 },
    28: { min: 94, max: 228 },
    29: { min: 92, max: 231 },
    30: { min: 90, max: 234 },
    31: { min: 88, max: 238 },
    32: { min: 86, max: 242 },
    33: { min: 83, max: 245 },
    34: { min: 81, max: 248 },
    35: { min: 79, max: 249 },
    36: { min: 77, max: 249 },
    37: { min: 75, max: 244 },
    38: { min: 73, max: 239 },
    39: { min: 72, max: 226 },
    40: { min: 71, max: 214 },
    41: { min: 70, max: 194 }
  };

  // =========================================================================
  // 2. ESTADO CENTRALIZADO DO MÓDULO OBSTÉTRICO SIMPLES
  // =========================================================================
  const state = {
    currentRenderedWeek: null, // Última semana renderizada no laudo
    savedPaperHtml: null,      // Preserva HTML com edições manuais em caso de alteração temporária na datação
    savedPaperWeek: null,
    isManualEdit: false,
    manualEditBlocks: new Set(),
    deletedBlocks: new Set(),
    lastGeneratedBlocks: {},
    userEditedSlots: {},      // { blockId: Set<slotId> } — slots editados manualmente
    lastGeneratedSlots: {},   // { blockId: { slotId: html } } — último valor gerado por slot

    cronologia: {
      dumStatus: 'sim', // 'sim' | 'incerta' | 'nao'
      dum: '',
      dumCalculada: { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 },
      dumPadrao: true, // true (SIM) | false (NÃO)

      // Método alternativo quando DUM não é usada como padrão
      metodoAlternativo: 'primeira_usg', // 'primeira_usg' | 'referida'

      // Opção A: Primeira Ultrassonografia
      primeiraUsgData: '',
      primeiraUsgSem: '',
      primeiraUsgDias: '',
      primeiraUsgCalculada: { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 },

      // Opção B: Idade Gestacional Referida
      igReferidaSem: '',
      igReferidaDias: '',

      // Idade Gestacional de Referência Ativa Unificada
      igAtiva: { valid: false, semanas: null, dias: null, metodo: null, origemTexto: '', dpp: '' }
    },

    estatica: {
      situacao: 'longitudinal', // 'longitudinal' | 'transversa' | 'obliqua'
      apresentacao: 'cefalica', // 'cefalica' | 'pelvica' | 'cormica'
      dorso: 'direita', // 'direita' | 'esquerda' | 'anterior' | 'posterior'
      movimentacao: 'ativa_normal' // 'ativa_normal' | 'presente_diminuida' | 'ausente'
    },

    bcf: '', // bpm

    placenta: {
      insercao: 'corporal anterior',
      grau: 'I',
      espessura: '', // mm
      cordao: 'tres_vasos' // 'tres_vasos' | 'arteria_unica' | 'circular'
    },

    liquido: {
      // Campos iniciam estritamente vazios (sem valores fictícios)
      ila: '', // mm
      maiorBolsao: '', // mm
      classificacao: 'normal', // 'normal' | 'diminuido' | 'oligoidramnio' | 'aumentado' | 'polidramnio'
      statusRef: 'aguardando' // 'aguardando' | 'normal' | 'abaixo' | 'acima'
    },

    morfologia: {
      padrao: true,
      obs: ''
    },

    biometria: {
      dbp: '',
      dof: '',
      cc: '',
      ca: '',
      cf: '',
      cu: '',
      ccCa: null,
      indiceCefalico: null,
      peso: null,
      percentil: null,
      igBiometria: { valid: false, semanas: 0, dias: 0, margemDias: 14 }
    },

    conclusao: {
      crescimento: 'adequado',
      vitalidade: 'adequada',
      obs: '',
      notaFinal: true
    }
  };

  // =========================================================================
  // 3. ELEMENTOS DOM
  // =========================================================================
  const dom = {};

  function initDom() {
    dom.themeToggleBtn = document.getElementById('themeToggleBtn');
    dom.themeIconSun = document.getElementById('themeIconSun');
    dom.themeIconMoon = document.getElementById('themeIconMoon');

    // Cronologia
    dom.selDumStatus = document.getElementById('selDumStatus');
    dom.containerDum = document.getElementById('containerDum');
    dom.groupDumData = document.getElementById('groupDumData');
    dom.inputDum = document.getElementById('inputDum');
    dom.dumFeedbackBox = document.getElementById('dumFeedbackBox');
    dom.dumIgDisplay = document.getElementById('dumIgDisplay');

    dom.btnDumPadraoSim = document.getElementById('btnDumPadraoSim');
    dom.btnDumPadraoNao = document.getElementById('btnDumPadraoNao');

    dom.containerDatacaoAlternativa = document.getElementById('containerDatacaoAlternativa');
    dom.btnMetodoPrimeiraUsg = document.getElementById('btnMetodoPrimeiraUsg');
    dom.btnMetodoReferida = document.getElementById('btnMetodoReferida');

    dom.panelPrimeiraUsg = document.getElementById('panelPrimeiraUsg');
    dom.inputPrimeiraUsgData = document.getElementById('inputPrimeiraUsgData');
    dom.inputPrimeiraUsgSem = document.getElementById('inputPrimeiraUsgSem');
    dom.inputPrimeiraUsgDias = document.getElementById('inputPrimeiraUsgDias');
    dom.primeiraUsgFeedbackBox = document.getElementById('primeiraUsgFeedbackBox');
    dom.primeiraUsgIgDisplay = document.getElementById('primeiraUsgIgDisplay');

    dom.panelIgReferida = document.getElementById('panelIgReferida');
    dom.inputIgReferidaSem = document.getElementById('inputIgReferidaSem');
    dom.inputIgReferidaDias = document.getElementById('inputIgReferidaDias');

    dom.displayIgVigente = document.getElementById('displayIgVigente');
    dom.badgeIgDestaque = document.getElementById('badgeIgDestaque');

    // Estática (Gestação única exclusiva)
    dom.selSituacao = document.getElementById('selSituacao');
    dom.selApresentacao = document.getElementById('selApresentacao');
    dom.selDorso = document.getElementById('selDorso');
    dom.selMovimentacao = document.getElementById('selMovimentacao');

    // BCF (Seção Própria Independente)
    dom.inputFcf = document.getElementById('inputFcf');

    // Placenta
    dom.selPlacentaInsercao = document.getElementById('selPlacentaInsercao');
    dom.selPlacentaGrau = document.getElementById('selPlacentaGrau');
    dom.inputPlacentaEspessura = document.getElementById('inputPlacentaEspessura');
    dom.selCordao = document.getElementById('selCordao');

    // Líquido Amniótico (Apenas ILA e Maior Bolsão)
    dom.inputIla = document.getElementById('inputIla');
    dom.inputMaiorBolsao = document.getElementById('inputMaiorBolsao');
    dom.ilaRefDisplay = document.getElementById('ilaRefDisplay');
    dom.ilaRefTexto = document.getElementById('ilaRefTexto');
    dom.ilaFeedbackNormal = document.getElementById('ilaFeedbackNormal');
    dom.ilaFeedbackAlerta = document.getElementById('ilaFeedbackAlerta');
    dom.ilaAlertaTexto = document.getElementById('ilaAlertaTexto');
    dom.panelIlaClassificacao = document.getElementById('panelIlaClassificacao');
    dom.selIlaClassificacao = document.getElementById('selIlaClassificacao');

    // Morfologia
    dom.btnMorfoPadrao = document.getElementById('btnMorfoPadrao');
    dom.btnMorfoPersonalizada = document.getElementById('btnMorfoPersonalizada');
    dom.morfoPadraoInfo = document.getElementById('morfoPadraoInfo');
    dom.morfoPersonalizadaPanel = document.getElementById('morfoPersonalizadaPanel');
    dom.inputMorfoObs = document.getElementById('inputMorfoObs');

    // Biometria
    dom.inputDbp = document.getElementById('inputDbp');
    dom.inputDof = document.getElementById('inputDof');
    dom.inputCc = document.getElementById('inputCc');
    dom.inputCa = document.getElementById('inputCa');
    dom.inputCf = document.getElementById('inputCf');
    dom.inputCu = document.getElementById('inputCu');

    dom.displayCcCa = document.getElementById('displayCcCa');
    dom.displayDbfDof = document.getElementById('displayDbfDof');
    dom.displayPesoFetal = document.getElementById('displayPesoFetal');
    dom.displayPercentilPeso = document.getElementById('displayPercentilPeso');
    dom.displayIgBiometria = document.getElementById('displayIgBiometria');

    // Conclusão
    dom.selConclusaoCrescimento = document.getElementById('selConclusaoCrescimento');
    dom.selConclusaoVitalidade = document.getElementById('selConclusaoVitalidade');
    dom.inputConclusaoObs = document.getElementById('inputConclusaoObs');
    dom.btnNotaFinalSim = document.getElementById('btnNotaFinalSim');
    dom.btnNotaFinalNao = document.getElementById('btnNotaFinalNao');

    // Toolbar & Laudo
    dom.laudoStatusText = document.getElementById('laudoStatusText');
    dom.manualEditBadge = document.getElementById('manualEditBadge');
    dom.btnRestaurarLaudo = document.getElementById('btnRestaurarLaudo');
    dom.btnNovoExame = document.getElementById('btnNovoExame');
    dom.btnImprimir = document.getElementById('btnImprimir');
    dom.btnCopiarLaudo = document.getElementById('btnCopiarLaudo');
    dom.reportPaper = document.getElementById('reportPaper');

    // Modal & Toast
    dom.modalNovoExame = document.getElementById('modalNovoExame');
    dom.btnModalCancel = document.getElementById('btnModalCancel');
    dom.btnModalConfirm = document.getElementById('btnModalConfirm');
    dom.toastNotice = document.getElementById('toastNotice');
    dom.toastMessage = document.getElementById('toastMessage');
  }

  // =========================================================================
  // 4. FUNÇÕES UTILITÁRIAS, MATEMÁTICAS E CRONOLÓGICAS
  // =========================================================================

  function erf(x) {
    const sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  function zToPercentile(z) {
    const cdf = 0.5 * (1 + erf(z / Math.sqrt(2)));
    let p = Math.round(cdf * 100);
    if (p < 1) p = 1;
    if (p > 99) p = 99;
    return p;
  }

  function parseDateBR(str) {
    if (!str || str.length !== 10) return null;
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    const date = new Date(y, m, d);
    if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
    return date;
  }

  function formatDateBR(date) {
    if (!date || isNaN(date.getTime())) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  function formatNumBR(val, decimals = 1) {
    if (val === null || val === undefined || isNaN(val) || val === '') return '';
    return Number(val).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function applyDateMask(val) {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }

  // Cálculo de IG pela DUM
  function calculateGestationalAgeByDum(dumDate, refDate = new Date()) {
    if (!dumDate) return { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    const diffMs = refDate.getTime() - dumDate.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias < 0 || diffDias > 310) {
      return { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    }
    const semanas = Math.floor(diffDias / 7);
    const dias = diffDias % 7;
    const dppDate = new Date(dumDate.getTime() + 280 * 24 * 60 * 60 * 1000);
    return {
      valid: true,
      semanas,
      dias,
      dpp: formatDateBR(dppDate),
      diasTotais: diffDias
    };
  }

  // Cálculo de IG pelo Exame Ultrassonográfico Inicial (Primeira Ultrassonografia)
  function calculateGestationalAgeByInitialExam(examDate, semAnt, diasAnt, refDate = new Date()) {
    if (!examDate || isNaN(semAnt) || semAnt <= 0) {
      return { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    }
    const diffMs = refDate.getTime() - examDate.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias < 0 || diffDias > 300) {
      return { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    }
    const totalDiasAnt = (Number(semAnt) * 7) + (Number(diasAnt) || 0);
    const totalDiasAtual = totalDiasAnt + diffDias;
    const semanas = Math.floor(totalDiasAtual / 7);
    const dias = totalDiasAtual % 7;
    const diasRestantes = 280 - totalDiasAnt;
    const dppDate = new Date(examDate.getTime() + diasRestantes * 24 * 60 * 60 * 1000);

    return {
      valid: true,
      semanas,
      dias,
      dpp: formatDateBR(dppDate),
      diasTotais: totalDiasAtual
    };
  }

  // =========================================================================
  // 5. DATAÇÃO REFORMATADA: DETERMINAÇÃO DA IG DE REFERÊNCIA ÚNICA
  // =========================================================================

  function updateActiveGestationalAge() {
    const cron = state.cronologia;

    // Estado inicial: datação indefinida (sem valores padrão ou fictícios)
    cron.igAtiva = {
      valid: false,
      semanas: null,
      dias: null,
      metodo: null,
      origemTexto: '',
      dpp: ''
    };

    // Caso 1: Paciente sabe a DUM, optou por usar como padrão E a DUM foi preenchida e é válida
    if (cron.dumStatus === 'sim' && cron.dumPadrao) {
      if (cron.dumCalculada && cron.dumCalculada.valid) {
        cron.igAtiva = {
          valid: true,
          semanas: cron.dumCalculada.semanas,
          dias: cron.dumCalculada.dias,
          metodo: 'dum',
          origemTexto: 'pela DUM',
          dpp: cron.dumCalculada.dpp
        };
      }
    } else {
      // Caso 2: DUM não utilizada como padrão (seja por NÃO, por DUM incerta ou não informada)
      if (cron.metodoAlternativo === 'primeira_usg') {
        if (cron.primeiraUsgCalculada && cron.primeiraUsgCalculada.valid) {
          cron.igAtiva = {
            valid: true,
            semanas: cron.primeiraUsgCalculada.semanas,
            dias: cron.primeiraUsgCalculada.dias,
            metodo: 'primeira_usg',
            origemTexto: 'segundo exame ultrassonográfico inicial',
            dpp: cron.primeiraUsgCalculada.dpp
          };
        }
      } else if (cron.metodoAlternativo === 'referida') {
        // Opção B: Idade gestacional referida preenchida
        const rawSem = cron.igReferidaSem;
        if (rawSem !== '' && rawSem !== null && rawSem !== undefined) {
          const sem = parseInt(rawSem, 10);
          if (!isNaN(sem)) {
            const rawDias = parseInt(cron.igReferidaDias, 10);
            const dias = (!isNaN(rawDias) && rawDias >= 0 && rawDias <= 6) ? rawDias : 0;
            cron.igAtiva = {
              valid: true,
              semanas: sem,
              dias: dias,
              metodo: 'referida',
              origemTexto: 'referida',
              dpp: ''
            };
          }
        }
      }
    }

    // Atualiza o display visual de destaque: só exibe quando houver datação válida entre 16 e 41 semanas
    if (dom.badgeIgDestaque) {
      if (cron.igAtiva.valid && cron.igAtiva.semanas >= 16 && cron.igAtiva.semanas <= 41) {
        dom.badgeIgDestaque.style.display = 'flex';
        if (dom.displayIgVigente) {
          const { semanas, dias, origemTexto } = cron.igAtiva;
          dom.displayIgVigente.textContent = `${semanas} semanas e ${dias} dias (${origemTexto})`;
        }
      } else {
        dom.badgeIgDestaque.style.display = 'none';
        if (dom.displayIgVigente) {
          dom.displayIgVigente.textContent = '—';
        }
      }
    }

    // Reavalia ILA e Biometria com base na semana atual de referência
    updateIlaReferenceBanner();
    checkIlaClassification();
    calculateBiometry();
    renderReportText();
  }

  // =========================================================================

  function calculateBiometry() {
    const dbp = parseFloat(state.biometria.dbp);
    const dof = parseFloat(state.biometria.dof);
    const cc  = parseFloat(state.biometria.cc);
    const ca  = parseFloat(state.biometria.ca);
    const cf  = parseFloat(state.biometria.cf);

    // 1. Índice CC/CA
    if (cc > 0 && ca > 0) {
      state.biometria.ccCa = (cc / ca).toFixed(2);
    } else {
      state.biometria.ccCa = null;
    }

    // 2. Índice Cefálico DBP/DOF (normal: 70 a 86%)
    if (dbp > 0 && dof > 0) {
      state.biometria.indiceCefalico = Math.round((dbp / dof) * 100);
    } else {
      state.biometria.indiceCefalico = null;
    }

    // 3. Estimativa de Peso Fetal (Hadlock 4 parâmetros: DBP, CC, CA, CF em cm)
    if (dbp > 0 && cc > 0 && ca > 0 && cf > 0) {
      const dbpCm = dbp / 10;
      const ccCm  = cc / 10;
      const caCm  = ca / 10;
      const cfCm  = cf / 10;

      const log10Peso = 1.3596 +
        (0.00061 * dbpCm * caCm) +
        (0.0424 * caCm) +
        (0.174 * cfCm) +
        (0.0064 * ccCm) -
        (0.00386 * caCm * cfCm);

      const pesoCalculado = Math.round(Math.pow(10, log10Peso));
      state.biometria.peso = pesoCalculado;

      // 4. Percentil de Peso Fetal de Hadlock pela IG Ativa (somente se houver datação válida)
      if (state.cronologia.igAtiva.valid) {
        const { semanas, dias } = state.cronologia.igAtiva;
        const MA = semanas + (dias / 7);

        if (MA >= 16 && MA <= 42) {
          const lnMediaG = 0.578 + (0.332 * MA) - (0.00354 * MA * MA);
          const z = (Math.log(pesoCalculado) - lnMediaG) / 0.13;
          state.biometria.percentil = zToPercentile(z);
        } else {
          state.biometria.percentil = null;
        }
      } else {
        state.biometria.percentil = null;
      }
    } else {
      state.biometria.peso = null;
      state.biometria.percentil = null;
    }

    // 5. Idade Gestacional Estimada pela Biometria Fetal
    calculateBiometricGestationalAge();
    updateBiometryDisplay();
  }

  // AUA — Average Ultrasound Age (Hadlock, metodologia GE Voluson S6)
  // Equações individuais: resultado em semanas, convertido para dias antes da média.
  // Coeficientes: Hadlock RP et al. Radiology. 1984;152(2):497-501.
  function calculateBiometricGestationalAge() {
    const dbp = parseFloat(state.biometria.dbp);
    const cc  = parseFloat(state.biometria.cc);
    const ca  = parseFloat(state.biometria.ca);
    const cf  = parseFloat(state.biometria.cf);

    // AUA (Average Ultrasound Age) — Hadlock (metodologia GE Voluson S6)
    // Cada estimativa individual de semanas é convertida para dias antes da média aritmética
    const gasDias = [];
    if (!isNaN(dbp) && dbp > 0) {
      const dbpCm = dbp / 10;
      gasDias.push((9.54 + (1.482 * dbpCm) + (0.1676 * dbpCm * dbpCm)) * 7);
    }
    if (!isNaN(cc) && cc > 0) {
      const ccCm = cc / 10;
      gasDias.push((8.96 + (0.540 * ccCm) + (0.0003 * ccCm * ccCm * ccCm)) * 7);
    }
    if (!isNaN(ca) && ca > 0) {
      const caCm = ca / 10;
      gasDias.push((8.14 + (0.753 * caCm) + (0.0036 * caCm * caCm)) * 7);
    }
    if (!isNaN(cf) && cf > 0) {
      const cfCm = cf / 10;
      gasDias.push((10.35 + (2.460 * cfCm) + (0.170 * cfCm * cfCm)) * 7);
    }

    if (gasDias.length > 0) {
      const mediaDias = gasDias.reduce((a, b) => a + b, 0) / gasDias.length;
      const totalDias = Math.round(mediaDias);
      let semanas = Math.floor(totalDias / 7);
      let dias    = totalDias % 7;
      if (dias >= 7) {
        semanas += Math.floor(dias / 7);
        dias = dias % 7;
      }

      let margem = 14;
      if (semanas <= 20) margem = 10;
      else if (semanas >= 30) margem = 21;

      state.biometria.igBiometria = {
        valid: true,
        semanas,
        dias,
        margemDias: margem
      };
    } else {
      state.biometria.igBiometria = { valid: false, semanas: 0, dias: 0, margemDias: 14 };
    }
  }

  function updateBiometryDisplay() {
    if (dom.displayCcCa) {
      dom.displayCcCa.textContent = state.biometria.ccCa 
        ? `${state.biometria.ccCa} (normal)`
        : '—';
    }
    if (dom.displayDbfDof) {
      dom.displayDbfDof.textContent = state.biometria.indiceCefalico 
        ? `${state.biometria.indiceCefalico}% (normal: 70 a 86%)`
        : '—';
    }
    if (dom.displayPesoFetal) {
      dom.displayPesoFetal.textContent = state.biometria.peso 
        ? `${state.biometria.peso} g ± 10%`
        : '— g ± 10%';
    }
    if (dom.displayPercentilPeso) {
      if (state.biometria.percentil !== null) {
        dom.displayPercentilPeso.textContent = `p${state.biometria.percentil} de Hadlock`;
      } else {
        dom.displayPercentilPeso.textContent = '—';
      }
    }
    if (dom.displayIgBiometria) {
      if (state.biometria.igBiometria.valid) {
        const { semanas, dias, margemDias } = state.biometria.igBiometria;
        dom.displayIgBiometria.textContent = `${semanas} semanas e ${dias} dias (± ${margemDias} dias)`;
      } else {
        dom.displayIgBiometria.textContent = '—';
      }
    }
  }

  // =========================================================================
  // 7. LÍQUIDO AMNIÓTICO: REFERÊNCIA AUTOMÁTICA, ALERTA E CLASSIFICAÇÃO
  // =========================================================================

  function updateIlaReferenceBanner() {
    if (!dom.ilaRefDisplay || !dom.ilaRefTexto) return;

    // Quando não houver datação válida: a referência do ILA permanece oculta
    if (!state.cronologia.igAtiva.valid) {
      dom.ilaRefDisplay.style.display = 'none';
      dom.ilaRefTexto.textContent = '';
      return;
    }

    let sem = Math.round(state.cronologia.igAtiva.semanas);
    if (sem < 16) sem = 16;
    if (sem > 41) sem = 41;

    const ref = TABELA_ILA_REFERENCIA[sem];
    if (!ref) return;

    dom.ilaRefDisplay.style.display = 'flex';
    if (sem <= 19) {
      dom.ilaRefTexto.textContent = `Para ${sem} semanas (16 a 19 semanas): apenas descrição de normalidade do maior bolsão vertical (20 a 80 mm), sem intervalo numérico de ILA.`;
    } else {
      dom.ilaRefTexto.textContent = `Referência do ILA para esta idade gestacional (${sem} semanas): ${ref.min}–${ref.max} mm.`;
    }
  }

  function checkIlaClassification() {
    // Quando não houver datação válida: classificação automática do ILA permanece desativada
    if (!state.cronologia.igAtiva.valid) {
      if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
      if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'none';
      if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'none';
      state.liquido.statusRef = 'aguardando';
      return;
    }

    const rawIla = state.liquido.ila;
    const rawMbv = state.liquido.maiorBolsao;

    // Se ambos os campos estiverem vazios, não classifica e oculta badges
    if ((rawIla === '' || rawIla === null) && (rawMbv === '' || rawMbv === null)) {
      if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
      if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'none';
      if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'none';
      state.liquido.statusRef = 'aguardando';
      state.liquido.classificacao = 'normal';
      if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'normal';
      return;
    }

    let sem = Math.round(state.cronologia.igAtiva.semanas);
    if (sem < 16) sem = 16;
    if (sem > 41) sem = 41;

    const ref = TABELA_ILA_REFERENCIA[sem];

    // Para 20 a 41 semanas: avaliação primária pelo ILA
    if (sem >= 20 && rawIla !== '' && rawIla !== null && !isNaN(parseFloat(rawIla))) {
      const val = parseFloat(rawIla);
      const min = ref.min;
      const max = ref.max;

      if (val >= min && val <= max) {
        // Dentro da referência
        state.liquido.statusRef = 'normal';
        state.liquido.classificacao = 'normal';
        if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'normal';
        if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'flex';
        if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'none';
        if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'none';
      } else if (val < min) {
        // Abaixo da referência
        state.liquido.statusRef = 'abaixo';
        if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
        if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'flex';
        if (dom.ilaAlertaTexto) {
          dom.ilaAlertaTexto.textContent = `⚠ Atenção: ILA de ${val} mm está abaixo do limite de referência (${min}–${max} mm).`;
        }
        if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'block';

        // Sugere opção de redução se ainda estiver como 'normal' ou 'aumentado'
        if (state.liquido.classificacao === 'normal' || state.liquido.classificacao === 'aumentado' || state.liquido.classificacao === 'polidramnio') {
          state.liquido.classificacao = 'diminuido';
          if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'diminuido';
        }
      } else {
        // Acima da referência
        state.liquido.statusRef = 'acima';
        if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
        if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'flex';
        if (dom.ilaAlertaTexto) {
          dom.ilaAlertaTexto.textContent = `⚠ Atenção: ILA de ${val} mm está acima do limite de referência (${min}–${max} mm).`;
        }
        if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'block';

        // Sugere opção de aumento se ainda estiver como 'normal' ou 'diminuido'
        if (state.liquido.classificacao === 'normal' || state.liquido.classificacao === 'diminuido' || state.liquido.classificacao === 'oligoidramnio') {
          state.liquido.classificacao = 'aumentado';
          if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'aumentado';
        }
      }
    } else if (sem <= 19 && rawMbv !== '' && rawMbv !== null && !isNaN(parseFloat(rawMbv))) {
      // Para 16 a 19 semanas: avaliação pelo maior bolsão vertical (20 a 80 mm)
      const mbv = parseFloat(rawMbv);
      if (mbv >= 20 && mbv <= 80) {
        state.liquido.statusRef = 'normal';
        state.liquido.classificacao = 'normal';
        if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'normal';
        if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'flex';
        if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'none';
        if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'none';
      } else if (mbv < 20) {
        state.liquido.statusRef = 'abaixo';
        if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
        if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'flex';
        if (dom.ilaAlertaTexto) {
          dom.ilaAlertaTexto.textContent = `⚠ Atenção: maior bolsão vertical de ${mbv} mm está abaixo do limite normal (20 a 80 mm).`;
        }
        if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'block';
        if (state.liquido.classificacao === 'normal') {
          state.liquido.classificacao = 'diminuido';
          if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'diminuido';
        }
      } else {
        state.liquido.statusRef = 'acima';
        if (dom.ilaFeedbackNormal) dom.ilaFeedbackNormal.style.display = 'none';
        if (dom.ilaFeedbackAlerta) dom.ilaFeedbackAlerta.style.display = 'flex';
        if (dom.ilaAlertaTexto) {
          dom.ilaAlertaTexto.textContent = `⚠ Atenção: maior bolsão vertical de ${mbv} mm está acima do limite normal (20 a 80 mm).`;
        }
        if (dom.panelIlaClassificacao) dom.panelIlaClassificacao.style.display = 'block';
        if (state.liquido.classificacao === 'normal') {
          state.liquido.classificacao = 'aumentado';
          if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = 'aumentado';
        }
      }
    }
  }

  // =========================================================================
  // 8. GERAÇÃO DINÂMICA DO LAUDO (ESTRITA FIDELIDADE AOS MODELOS WORD)
  // =========================================================================

  // =========================================================================
  // 7-A. SINCRONIZAÇÃO INTELIGENTE POR BLOCOS
  // =========================================================================

  function normalizeContent(str) {
    if (!str) return '';
    return str.replace(/&nbsp;/g, ' ')
              .replace(/[\s\r\n]+/g, ' ')
              .trim();
  }

  // Retorna a chave unificada do slot para um elemento (ex: 'dynamic:bio_sem' ou 'static:s1')
  function getSlotKeyFromElement(el) {
    if (!el || !el.getAttribute) return null;
    const dyn = el.getAttribute('data-slot');
    if (dyn) return `dynamic:${dyn}`;
    const st = el.getAttribute('data-static-slot');
    if (st) return `static:${st}`;
    return null;
  }

  // Localiza o elemento de um slot (dinâmico ou estático) dentro de um contêiner
  function findSlotElement(container, slotKey) {
    if (!container || !slotKey) return null;
    if (slotKey.startsWith('dynamic:')) {
      return container.querySelector(`[data-slot="${slotKey.slice(8)}"]`);
    }
    if (slotKey.startsWith('static:')) {
      return container.querySelector(`[data-static-slot="${slotKey.slice(7)}"]`);
    }
    return null;
  }

  // Retorna o conjunto de todas as chaves de slot presentes no elemento DOM
  function getDomSlotKeys(container) {
    if (!container) return new Set();
    const keys = new Set();
    container.querySelectorAll('[data-slot]').forEach(el => {
      keys.add(`dynamic:${el.getAttribute('data-slot')}`);
    });
    container.querySelectorAll('[data-static-slot]').forEach(el => {
      keys.add(`static:${el.getAttribute('data-static-slot')}`);
    });
    return keys;
  }

  // Extrai os valores de todos os slots (dinâmicos e estáticos) de um fragmento HTML
  function extractSlots(html) {
    if (!html) return {};
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const slots = {};
    temp.querySelectorAll('[data-slot]').forEach(el => {
      slots[`dynamic:${el.getAttribute('data-slot')}`] = el.innerHTML;
    });
    temp.querySelectorAll('[data-static-slot]').forEach(el => {
      slots[`static:${el.getAttribute('data-static-slot')}`] = el.innerHTML;
    });
    return slots;
  }

  // Identifica o elemento ativo sob o cursor (caret) dentro de um contêiner contenteditable
  function getActiveCaretElement(container) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    let node = range.startContainer || sel.anchorNode;
    if (!node) return null;

    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    if (node.nodeType === Node.ELEMENT_NODE && node.childNodes.length > 0) {
      const offset = Math.min(range.startOffset, node.childNodes.length - 1);
      const child = node.childNodes[offset];
      if (child) {
        el = child.nodeType === Node.TEXT_NODE ? child.parentElement : child;
      }
    }

    if (el && container.contains(el) && el !== container) {
      return el;
    }
    return null;
  }

  function updateManualEditStatus() {
    if (!dom.reportPaper) return;

    let hasEdits = false;

    // 1. Blocos sem slots congelados
    if (state.manualEditBlocks.size > 0) hasEdits = true;

    // 2. Slots individualmente editados pelo usuário
    if (!hasEdits && Object.values(state.userEditedSlots).some(s => s && s.size > 0)) hasEdits = true;

    // 3. Blocos deletados manualmente
    if (!hasEdits && state.deletedBlocks && state.deletedBlocks.size > 0) hasEdits = true;

    // 4. Parágrafos adicionados manualmente (fora de qualquer data-block)
    if (!hasEdits && dom.reportPaper.querySelectorAll('[data-custom="true"]').length > 0) hasEdits = true;

    // 5. Verificação DOM: detecta qualquer bloco com texto divergente do gerado
    if (!hasEdits) {
      const domBlocks = dom.reportPaper.querySelectorAll(':scope > [data-block]');
      for (let i = 0; i < domBlocks.length; i++) {
        const el = domBlocks[i];
        const id = el.getAttribute('data-block');
        if (el.getAttribute('data-manual-edit') === 'true') {
          hasEdits = true;
          break;
        }
        if (state.lastGeneratedBlocks[id] !== undefined) {
          if (normalizeContent(el.innerHTML) !== normalizeContent(state.lastGeneratedBlocks[id])) {
            hasEdits = true;
            break;
          }
        }
      }
    }

    state.isManualEdit = hasEdits;

    if (dom.manualEditBadge) {
      dom.manualEditBadge.classList.toggle('active', hasEdits);
      dom.manualEditBadge.style.display = hasEdits ? 'inline-block' : 'none';
    }
    if (dom.laudoStatusText) {
      dom.laudoStatusText.textContent = hasEdits ? 'Edição Manual Ativa' : 'Laudo Dinâmico Sincronizado';
    }
    if (dom.btnRestaurarLaudo) {
      dom.btnRestaurarLaudo.style.display = hasEdits ? 'inline-flex' : 'none';
    }
  }

  function syncReportBlocks(blocks) {
    if (!dom.reportPaper) return;

    // Se a folha estiver exibindo aviso orientativo, limpa para montagem dos blocos
    if (dom.reportPaper.querySelector('.report-empty-notice')) {
      dom.reportPaper.innerHTML = '';
    }

    if (!dom.reportPaper.children.length) {
      dom.reportPaper.innerHTML = blocks.map(b => {
        const clsAttr = b.className ? ` class="${b.className}"` : '';
        return `<p${clsAttr} data-block="${b.id}">${b.html}</p>`;
      }).join('\n');

      state.lastGeneratedBlocks = {};
      state.lastGeneratedSlots  = {};
      state.userEditedSlots     = {};
      blocks.forEach(b => {
        state.lastGeneratedBlocks[b.id] = b.html;
        const slots = extractSlots(b.html);
        if (Object.keys(slots).length) state.lastGeneratedSlots[b.id] = slots;
      });
      state.manualEditBlocks.clear();
      if (state.deletedBlocks) state.deletedBlocks.clear();
      state.isManualEdit = false;
      if (dom.manualEditBadge)   dom.manualEditBadge.style.display = 'none';
      if (dom.laudoStatusText)   dom.laudoStatusText.textContent = 'Laudo Dinâmico Sincronizado';
      if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'none';
      return;
    }

    // ── SINCRONIZAÇÃO INCREMENTAL bloco a bloco ───────────────────────────────
    const currentBlockIds = new Set(blocks.map(b => b.id));
    let lastDomEl = null;

    blocks.forEach(b => {
      const existingEl = dom.reportPaper.querySelector(`:scope > [data-block="${b.id}"]`);

      if (existingEl) {
        const newSlots  = extractSlots(b.html);
        const hasSlots  = Object.keys(newSlots).length > 0;
        const userSlots = state.userEditedSlots[b.id] || new Set();
        let customAnchor = existingEl;

        if (hasSlots) {
          // ── Bloco com slots: RECONCILIAÇÃO ESTRUTURAL COMPLETA ─────────────
          const newSlotKeys = new Set(Object.keys(newSlots));
          const domSlotKeys = getDomSlotKeys(existingEl);

          // 1. Criar contêiner temporário com a nova estrutura canônica gerada pelo sistema
          const temp = document.createElement('div');
          temp.innerHTML = b.html;

          // 2. Para cada slot da nova estrutura:
          //    a) Se o slot existia no DOM e foi editado pelo médico, preservar o conteúdo personalizado
          //    b) Se havia um parágrafo customizado originado deste slot (quando temporariamente órfão), restaurá-lo
          newSlotKeys.forEach(slotKey => {
            const targetEl = findSlotElement(temp, slotKey);
            if (!targetEl) return;

            if (userSlots.has(slotKey)) {
              const currentEl = findSlotElement(existingEl, slotKey);
              if (currentEl) {
                targetEl.innerHTML = currentEl.innerHTML;
              }
            } else {
              // Verificar se existe parágrafo customizado originado deste slot
              const customOriginEl = dom.reportPaper.querySelector(`[data-custom-origin="${b.id}_${slotKey}"]`);
              if (customOriginEl) {
                targetEl.innerHTML = customOriginEl.innerHTML;
                customOriginEl.remove();
                if (!state.userEditedSlots[b.id]) state.userEditedSlots[b.id] = new Set();
                state.userEditedSlots[b.id].add(slotKey);
              }
            }
          });

          // 3. Slots antigos que deixaram de existir na nova estrutura:
          //    a) Se NÃO foram editados manualmente: são simplesmente descartados.
          //    b) Se FORAM editados manualmente com texto diferente do gerado originalmente:
          //       Manter o trecho como conteúdo manual independente (<p data-custom="true">),
          //       claramente identificado e posicionado imediatamente após o bloco de origem.
          domSlotKeys.forEach(oldSlotKey => {
            if (!newSlotKeys.has(oldSlotKey)) {
              if (userSlots.has(oldSlotKey)) {
                const oldEl = findSlotElement(existingEl, oldSlotKey);
                const editedContent = oldEl ? oldEl.innerHTML.trim() : '';
                const lastGen = (state.lastGeneratedSlots[b.id] && state.lastGeneratedSlots[b.id][oldSlotKey])
                  ? state.lastGeneratedSlots[b.id][oldSlotKey].trim()
                  : '';

                // Só preserva como independente se o conteúdo realmente difere do gerado pelo sistema
                if (editedContent && normalizeContent(editedContent) !== normalizeContent(lastGen)) {
                  const originKey = `${b.id}_${oldSlotKey}`;
                  let existingCustom = dom.reportPaper.querySelector(`[data-custom-origin="${originKey}"]`);
                  if (!existingCustom) {
                    existingCustom = document.createElement('p');
                    existingCustom.setAttribute('data-custom', 'true');
                    existingCustom.setAttribute('data-custom-origin', originKey);
                  }
                  existingCustom.innerHTML = editedContent;

                  // Posicionar imediatamente após o bloco de origem (ou após o parágrafo personalizado anterior)
                  if (customAnchor.nextSibling !== existingCustom) {
                    if (customAnchor.nextSibling) {
                      dom.reportPaper.insertBefore(existingCustom, customAnchor.nextSibling);
                    } else {
                      dom.reportPaper.appendChild(existingCustom);
                    }
                  }
                  customAnchor = existingCustom;
                }
              }
            }
          });

          // 4. Atualizar o DOM existente com a nova estrutura canônica reconciliada
          // (Sem elementos órfãos anexados internamente)
          existingEl.innerHTML = temp.innerHTML;

          // Atualizar classe CSS se necessário
          if (existingEl.className !== b.className) existingEl.className = b.className;

          // Atualizar o registro interno de slots gerados para refletir exatamente a nova estrutura
          state.lastGeneratedSlots[b.id] = { ...newSlots };

          // Limpar de userEditedSlots quaisquer chaves obsoletas que não existam mais no DOM do bloco
          if (state.userEditedSlots[b.id]) {
            const currentDomKeys = getDomSlotKeys(existingEl);
            for (const editedKey of state.userEditedSlots[b.id]) {
              if (!currentDomKeys.has(editedKey)) {
                state.userEditedSlots[b.id].delete(editedKey);
              }
            }
            if (state.userEditedSlots[b.id].size === 0) {
              delete state.userEditedSlots[b.id];
            }
          }

        } else {
          // ── Bloco sem slots (títulos, quebras): controle por bloco inteiro ──
          const isEdited = state.manualEditBlocks.has(b.id) ||
                           existingEl.getAttribute('data-manual-edit') === 'true' ||
                           (state.lastGeneratedBlocks[b.id] !== undefined &&
                            normalizeContent(existingEl.innerHTML) !== normalizeContent(state.lastGeneratedBlocks[b.id]));

          if (isEdited) {
            state.manualEditBlocks.add(b.id);
            existingEl.setAttribute('data-manual-edit', 'true');
          } else {
            if (existingEl.innerHTML !== b.html) existingEl.innerHTML = b.html;
            if (existingEl.className !== b.className) existingEl.className = b.className;
          }
        }

        state.lastGeneratedBlocks[b.id] = b.html;

        // Determinar o último elemento deste bloco (incluindo seus parágrafos personalizados vinculados)
        let anchor = customAnchor;
        while (
          anchor.nextElementSibling &&
          (anchor.nextElementSibling.getAttribute('data-custom') === 'true' ||
           anchor.nextElementSibling.hasAttribute('data-custom-origin') ||
           !anchor.nextElementSibling.hasAttribute('data-block') ||
           !currentBlockIds.has(anchor.nextElementSibling.getAttribute('data-block')))
        ) {
          const nextOrigin = anchor.nextElementSibling.getAttribute('data-custom-origin');
          if (nextOrigin && !nextOrigin.startsWith(`${b.id}_`)) {
            const belongsToActiveBlock = Array.from(currentBlockIds).some(id => nextOrigin.startsWith(`${id}_`));
            if (belongsToActiveBlock) {
              break;
            }
          }
          anchor = anchor.nextElementSibling;
        }
        lastDomEl = anchor;

      } else {
        // ── Bloco ainda não existe no DOM: inserir ────────────────────────────
        if (state.isManualEdit && state.deletedBlocks && state.deletedBlocks.has(b.id)) return;

        const newEl = document.createElement('p');
        if (b.className) newEl.className = b.className;
        newEl.setAttribute('data-block', b.id);
        newEl.innerHTML = b.html;

        if (lastDomEl && lastDomEl.nextSibling) {
          dom.reportPaper.insertBefore(newEl, lastDomEl.nextSibling);
        } else if (lastDomEl) {
          dom.reportPaper.appendChild(newEl);
        } else {
          dom.reportPaper.insertBefore(newEl, dom.reportPaper.firstChild);
        }

        state.lastGeneratedBlocks[b.id] = b.html;
        const slots = extractSlots(b.html);
        if (Object.keys(slots).length) state.lastGeneratedSlots[b.id] = slots;
        lastDomEl = newEl;
      }
    });

    // ── Remover blocos obsoletos (que o formulário não gera mais) ─────────────
    Array.from(dom.reportPaper.querySelectorAll(':scope > [data-block]')).forEach(el => {
      const blockId = el.getAttribute('data-block');
      if (!currentBlockIds.has(blockId)) {
        const hasUserSlots = state.userEditedSlots[blockId] && state.userEditedSlots[blockId].size > 0;
        const isUserBlock  = state.manualEditBlocks.has(blockId) ||
                             el.getAttribute('data-manual-edit') === 'true' ||
                             hasUserSlots;
        if (!isUserBlock) {
          el.remove();
          delete state.lastGeneratedBlocks[blockId];
          delete state.lastGeneratedSlots[blockId];
          delete state.userEditedSlots[blockId];
        }
      }
    });

    updateManualEditStatus();
  }

  function renderReportText() {
    if (!dom.reportPaper) return;

    const igAtiva = state.cronologia.igAtiva;
    const isValida = igAtiva && igAtiva.valid;
    const semanas = isValida ? igAtiva.semanas : null;
    const isSemanaValida = isValida && Number.isInteger(semanas) && semanas >= 16 && semanas <= 41;

    // Se a idade gestacional estiver ausente ou inválida, impede a exibição do laudo e exibe mensagem orientativa
    if (!isSemanaValida) {
      // Preserva o conteúdo do laudo com edições manuais se o médico estiver na mesma semana e alterar temporariamente a data
      if (dom.reportPaper.children.length > 0 && !dom.reportPaper.querySelector('.report-empty-notice') && state.isManualEdit) {
        state.savedPaperHtml = dom.reportPaper.innerHTML;
        state.savedPaperWeek = state.currentRenderedWeek;
      }

      state.currentRenderedWeek = null;

      if (isValida && semanas !== null && (semanas < 16 || semanas > 41)) {
        dom.reportPaper.innerHTML = `
          <div class="report-empty-notice error">
            <h3>Idade Gestacional Fora dos Limites do Exame (16 a 41 semanas)</h3>
            <p>A idade gestacional informada (<strong>${semanas} semanas</strong>) está fora dos limites de atendimento deste módulo.</p>
            <p>O exame <strong>Obstétrico Simples</strong> é realizado exclusivamente entre <strong>16 e 41 semanas</strong>, utilizando tabelas e valores de referência específicos para cada semana.</p>
            <p>Por favor, revise os dados informados na <strong>Seção 1 (Cronologia Gestacional e Datação)</strong> para carregar o laudo correspondente.</p>
          </div>
        `;
        if (dom.laudoStatusText) dom.laudoStatusText.textContent = 'Aguardando Idade Gestacional Válida';
      } else {
        dom.reportPaper.innerHTML = `
          <div class="report-empty-notice">
            <h3>Aguardando Definição da Idade Gestacional</h3>
            <p>Para carregar a máscara e as referências do exame, informe a datação na <strong>Seção 1 (Cronologia Gestacional e Datação)</strong> ao lado:</p>
            <ul>
              <li><strong>Data da DUM</strong> (se conhecida); ou</li>
              <li><strong>1ª Ultrassonografia</strong> (data e idade gestacional); ou</li>
              <li><strong>Idade Gestacional Referida</strong> (entre 16 e 41 semanas).</li>
            </ul>
            <p>O laudo e os valores de normalidade serão gerados automaticamente para a semana correspondente.</p>
          </div>
        `;
        if (dom.laudoStatusText) dom.laudoStatusText.textContent = 'Aguardando Idade Gestacional';
      }
      return;
    }

    // Se havia um laudo salvo com edições manuais na mesma semana gestacional, restaura-o
    if (state.savedPaperHtml && state.savedPaperWeek === semanas && dom.reportPaper.querySelector('.report-empty-notice')) {
      dom.reportPaper.innerHTML = state.savedPaperHtml;
      state.savedPaperHtml = null;
      state.savedPaperWeek = null;
    } else if (state.currentRenderedWeek !== semanas) {
      // Semana diferente: reinicia o DOM da folha para aplicar a máscara correta da nova semana
      state.currentRenderedWeek = semanas;
      state.savedPaperHtml = null;
      state.savedPaperWeek = null;
      dom.reportPaper.innerHTML = '';
    }

    if (dom.laudoStatusText && !state.isManualEdit) {
      dom.laudoStatusText.textContent = 'Laudo Dinâmico Sincronizado';
    }

    const blocks = [];
    const add = (id, html, className = '') => {
      blocks.push({ id, html, className });
    };

    // 1. TÍTULO PRINCIPAL CENTRALIZADO
    add('title', '<b>ULTRASSONOGRAFIA OBSTÉTRICA</b>', 'report-title');
    add('sp_title', '&nbsp;', 'report-blank-line');

    // 2. CRONOLOGIA GESTACIONAL (DUM E FRASE DE DATAÇÃO CONFORME MÉTODO)
    if (state.cronologia.dumStatus === 'sim') {
      if (state.cronologia.dum) {
        add('cron_dum', `<span data-static-slot="dum_lbl">Data da última menstruação: </span><span data-slot="dum_data">${state.cronologia.dum}</span><span data-static-slot="dum_pt">.</span>`);
      }
    } else if (state.cronologia.dumStatus === 'incerta') {
      add('cron_dum', '<span data-static-slot="dum_lbl">Data da última menstruação: </span><span data-static-slot="dum_val">incerta.</span>');
    } else {
      add('cron_dum', '<span data-static-slot="dum_lbl">Data da última menstruação: </span><span data-static-slot="dum_val">não informada.</span>');
    }

    if (state.cronologia.igAtiva.valid) {
      const { semanas, dias, metodo } = state.cronologia.igAtiva;
      const semTxt = semanas !== null && semanas !== undefined ? `${semanas}` : 'X';
      const diasTxt = dias !== null && dias !== undefined ? `${dias}` : '0';

      let fraseDatacao = '';
      if (metodo === 'dum') {
        fraseDatacao = `<span data-static-slot="s_pre">Exame ultrassonográfico realizado com </span><span data-slot="cron_sem">${semTxt}</span><span data-static-slot="s_mid"> semanas e </span><span data-slot="cron_dias">${diasTxt}</span><span data-static-slot="s_ig"> dias de idade gestacional </span><span data-static-slot="metodo_txt">segundo a data da última menstruação.</span>`;
      } else if (metodo === 'primeira_usg') {
        const dataOrig = state.cronologia.primeiraUsgData || '';
        const semOrig = state.cronologia.primeiraUsgSem !== '' && state.cronologia.primeiraUsgSem !== null && state.cronologia.primeiraUsgSem !== undefined ? `${state.cronologia.primeiraUsgSem}` : 'X';
        const rawDiasOrig = parseInt(state.cronologia.primeiraUsgDias, 10);
        const diasOrig = (!isNaN(rawDiasOrig) && rawDiasOrig >= 0) ? rawDiasOrig : 0;
        fraseDatacao = `<span data-static-slot="s_pre">Exame ultrassonográfico realizado com </span><span data-slot="cron_sem">${semTxt}</span><span data-static-slot="s_mid"> semanas e </span><span data-slot="cron_dias">${diasTxt}</span><span data-static-slot="s_ig"> dias de idade gestacional </span><span data-static-slot="metodo_txt">segundo exame ultrassonográfico inicial </span><span data-static-slot="usg_pre">(exame do dia </span><span data-slot="cron_usg_data">${dataOrig}</span><span data-static-slot="usg_mid"> com </span><span data-slot="cron_usg_sem">${semOrig}</span><span data-static-slot="usg_mid2"> semanas e </span><span data-slot="cron_usg_dias">${diasOrig}</span><span data-static-slot="usg_pos"> dias).</span>`;
      } else {
        fraseDatacao = `<span data-static-slot="s_pre">Exame ultrassonográfico realizado com </span><span data-slot="cron_sem">${semTxt}</span><span data-static-slot="s_mid"> semanas e </span><span data-slot="cron_dias">${diasTxt}</span><span data-static-slot="s_ig"> dias de idade gestacional </span><span data-static-slot="metodo_txt">referida.</span>`;
      }

      add('cron_frase_datacao', fraseDatacao);
      add('sp_cron', '&nbsp;', 'report-blank-line');
    } else if (state.cronologia.dumStatus === 'incerta' || state.cronologia.dumStatus === 'nao' || (state.cronologia.dumStatus === 'sim' && state.cronologia.dum)) {
      add('sp_cron', '&nbsp;', 'report-blank-line');
    }

    // 3. ESTÁTICA FETAL E VITALIDADE (SEMPRE FETO ÚNICO)
    const sitTxt = state.estatica.situacao;
    const aprTxt = state.estatica.apresentacao;
    const dorsoTxt = state.estatica.dorso;

    add('estatica_feto', `<span data-static-slot="s_pre">Feto único, em situação </span><span data-slot="sit_txt">${sitTxt}</span><span data-static-slot="s_mid1">, apresentação </span><span data-slot="apr_txt">${aprTxt}</span><span data-static-slot="s_mid2"> e dorso à </span><span data-slot="dorso_txt">${dorsoTxt}</span><span data-static-slot="s_pos">.</span>`);

    if (state.estatica.movimentacao === 'ativa_normal') {
      add('estatica_mov', '<span data-static-slot="mov_txt">Movimentação fetal ativa dentro dos padrões da normalidade.</span>');
    } else if (state.estatica.movimentacao === 'presente_diminuida') {
      add('estatica_mov', '<span data-static-slot="mov_txt">Movimentação fetal presente, porém diminuída durante o exame.</span>');
    } else {
      add('estatica_mov', '<span data-static-slot="mov_txt">Movimentação fetal não visibilizada no momento do exame.</span>');
    }
    add('sp_estatica', '&nbsp;', 'report-blank-line');

    // 4. PLACENTA E CORDÃO UMBILICAL
    add('placenta_title', '<b>PLACENTA E CORDÃO UMBILICAL</b>', 'report-section-title');
    const placIns = state.placenta.insercao;
    const placGrau = state.placenta.grau;
    const placEsp = state.placenta.espessura ? formatNumBR(state.placenta.espessura, 0) : 'X';

    add('placenta_desc', `<span data-static-slot="s_pre">Placenta de inserção </span><span data-slot="pl_ins">${placIns}</span><span data-static-slot="s_mid1">. A ecogenicidade é de Grau </span><span data-slot="pl_grau">${placGrau}</span><span data-static-slot="s_mid2">, segundo Grannum, medindo </span><span data-slot="pl_esp">${placEsp}</span><span data-static-slot="s_pos"> mm de espessura.</span>`);

    if (state.placenta.cordao === 'tres_vasos') {
      add('cordao_desc', '<span data-static-slot="cordao_txt">Cordão umbilical constituído de três vasos, sem alterações.</span>');
    } else if (state.placenta.cordao === 'arteria_unica') {
      add('cordao_desc', '<span data-static-slot="cordao_txt">Cordão umbilical constituído de dois vasos (artéria umbilical única).</span>');
    } else {
      add('cordao_desc', '<span data-static-slot="cordao_txt">Cordão umbilical com laço circular cervical no momento do exame.</span>');
    }
    add('sp_placenta', '&nbsp;', 'report-blank-line');

    // 5. LÍQUIDO AMNIÓTICO (CONFORME REGRAS E TABELA MOORE)
    add('liquido_title', '<b>LÍQUIDO AMNIÓTICO</b>', 'report-section-title');

    const classif = state.liquido.classificacao;
    if (classif === 'normal') {
      add('liquido_vol', '<span data-static-slot="vol_txt">Volume de líquido amniótico normal para a idade gestacional.</span>');
    } else if (classif === 'diminuido') {
      add('liquido_vol', '<span data-static-slot="vol_txt">Volume de líquido amniótico no limite inferior da normalidade para a idade gestacional.</span>');
    } else if (classif === 'oligoidramnio') {
      add('liquido_vol', '<span data-static-slot="vol_txt">Volume de líquido amniótico acentuadamente diminuído (oligoidrâmnio).</span>');
    } else if (classif === 'aumentado') {
      add('liquido_vol', '<span data-static-slot="vol_txt">Volume de líquido amniótico no limite superior da normalidade para a idade gestacional.</span>');
    } else if (classif === 'polidramnio') {
      add('liquido_vol', '<span data-static-slot="vol_txt">Volume de líquido amniótico acentuadamente aumentado (polidrâmnio).</span>');
    }

    const mbvVal = state.liquido.maiorBolsao !== '' && state.liquido.maiorBolsao !== null 
      ? formatNumBR(state.liquido.maiorBolsao, 0) 
      : 'X';
    const ilaVal = state.liquido.ila !== '' && state.liquido.ila !== null 
      ? formatNumBR(state.liquido.ila, 0) 
      : 'X';

    // Regra oficial:
    // Se houver datação válida:
    // 16 a 19 semanas: sem intervalo numérico de ILA, apenas maior bolsão
    // 20 a 41 semanas: ILA com intervalo numérico exato da tabela + maior bolsão + citação Moore
    // Se NÃO houver datação válida: não apresentar nenhuma referência de ILA no laudo
    if (state.cronologia.igAtiva.valid) {
      let sem = Math.round(state.cronologia.igAtiva.semanas);
      if (sem < 16) sem = 16;
      if (sem > 41) sem = 41;

      if (sem <= 19) {
        add('liquido_ila', `<span data-static-slot="mbv_pre">O maior bolsão vertical mede </span><span data-slot="mbv_val">${mbvVal}</span><span data-static-slot="mbv_pos"> mm (normal de 20 a 80 mm).</span>`);
      } else {
        const refIla = TABELA_ILA_REFERENCIA[sem];
        const minIla = refIla ? refIla.min : 90;
        const maxIla = refIla ? refIla.max : 230;
        add('liquido_ila', `<span data-static-slot="ila_pre">ILA: </span><span data-slot="ila_val">${ilaVal}</span><span data-static-slot="ila_ref_pre"> mm (normal para a idade gestacional de </span><span data-slot="ila_min">${minIla}</span><span data-static-slot="ila_ref_mid"> a </span><span data-slot="ila_max">${maxIla}</span><span data-static-slot="ila_ref_pos"> mm)* e maior bolsão vertical de </span><span data-slot="mbv_val">${mbvVal}</span><span data-static-slot="mbv_pos"> mm.</span>`);
        add('liquido_moore', '<span data-static-slot="moore_txt">*Moore TR, Cayle JE. Am J Obstet Gynecol. 1990 May;162(5):1168-73.</span>', 'report-note');
      }
    } else {
      add('liquido_ila', `<span data-static-slot="ila_pre">ILA: </span><span data-slot="ila_val">${ilaVal}</span><span data-static-slot="mbv_pre"> mm e maior bolsão vertical de </span><span data-slot="mbv_val">${mbvVal}</span><span data-static-slot="mbv_pos"> mm.</span>`);
    }
    add('sp_liquido', '&nbsp;', 'report-blank-line');

    // 6. MORFOLOGIA FETAL BÁSICA E BCF
    add('morfo_title', '<b>MORFOLOGIA FETAL</b>', 'report-section-title');
    add('morfo_cef', '<span data-static-slot="cef_txt">Polo cefálico: calota craniana normoecogênica. Foice cerebral e plexos coróides identificados e de aspecto aparentemente normal.</span>');

    const fcfVal = state.bcf ? state.bcf : 'X';
    add('morfo_torax', `<span data-static-slot="s_pre">Tórax: coração identificado e normoposicionado. FCF: </span><span data-slot="fcf_val">${fcfVal}</span><span data-static-slot="s_pos"> bpm.</span>`);
    add('morfo_abd', '<span data-static-slot="abd_txt">Abdome: foram visibilizados o estômago e a bexiga.</span>');
    add('morfo_membros', '<span data-static-slot="membros_txt">Membros: esqueleto apendicular com ecogenicidade adequada para a idade gestacional. Não se observam alterações grosseiras.</span>');
    add('morfo_coluna', '<span data-static-slot="coluna_txt">Coluna vertebral: todos os segmentos identificados e sem alterações detectáveis nesta idade gestacional.</span>');

    if (!state.morfologia.padrao && state.morfologia.obs) {
      add('morfo_obs', `<span data-static-slot="s_pre">Observações morfológicas adicionais: </span><span data-slot="morfo_obs_txt">${state.morfologia.obs}</span>`);
    }
    add('sp_morfo', '&nbsp;', 'report-blank-line');

    // 7. BIOMETRIA FETAL E ÍNDICES
    add('bio_title', '<b>BIOMETRIA FETAL</b>', 'report-section-title');
    const dbpTxt = state.biometria.dbp ? formatNumBR(state.biometria.dbp, 0) : 'X';
    const dofTxt = state.biometria.dof ? formatNumBR(state.biometria.dof, 0) : 'X';
    const ccTxt  = state.biometria.cc  ? formatNumBR(state.biometria.cc, 0)  : 'X';
    const caTxt  = state.biometria.ca  ? formatNumBR(state.biometria.ca, 0)  : 'X';
    const cfTxt  = state.biometria.cf  ? formatNumBR(state.biometria.cf, 0)  : 'X';
    const cuTxt  = state.biometria.cu  ? formatNumBR(state.biometria.cu, 0)  : 'X';
    const ccCaTxt = state.biometria.ccCa ? state.biometria.ccCa : 'X';
    const cefTxt = state.biometria.indiceCefalico ? state.biometria.indiceCefalico : 'X';
    const pesoTxt = state.biometria.peso ? formatNumBR(state.biometria.peso, 0) : 'X';

    add('bio_dbp', `<span data-static-slot="s_pre">Diâmetro biparietal (DBP): </span><span data-slot="dbp">${dbpTxt}</span><span data-static-slot="s_pos"> mm.</span>`);
    add('bio_dof', `<span data-static-slot="s_pre">Diâmetro occipitofrontal (DOF): </span><span data-slot="dof">${dofTxt}</span><span data-static-slot="s_pos"> mm.</span>`);
    add('bio_cc', `<span data-static-slot="s_pre">Circunferência craniana (CC): </span><span data-slot="cc">${ccTxt}</span><span data-static-slot="s_pos"> mm.</span>`);
    add('bio_ca', `<span data-static-slot="s_pre">Circunferência abdominal (CA): </span><span data-slot="ca">${caTxt}</span><span data-static-slot="s_pos"> mm.</span>`);
    add('bio_cf', `<span data-static-slot="s_pre">Comprimento do fêmur (CF): </span><span data-slot="cf">${cfTxt}</span><span data-static-slot="s_pos"> mm.</span>`);
    add('bio_cu', `<span data-static-slot="s_pre">Comprimento do úmero (CU): </span><span data-slot="cu">${cuTxt}</span><span data-static-slot="s_pos"> mm.</span>`);
    add('bio_cc_ca', `<span data-static-slot="s_pre">Índice CC/CA: </span><span data-slot="cc_ca">${ccCaTxt}</span><span data-static-slot="s_pos"> (normal para idade gestacional).</span>`);
    add('bio_cef', `<span data-static-slot="s_pre">Índice cefálico DBP/DOF:  </span><span data-slot="cef">${cefTxt}</span><span data-static-slot="s_pos"> (normal: 70 a 86).</span>`);
    add('bio_peso', `<span data-static-slot="s_pre">Peso fetal estimado: </span><span data-slot="peso">${pesoTxt}</span><span data-static-slot="s_pos"> g +/- 10%.</span>`);
    add('sp_bio', '&nbsp;', 'report-blank-line');

    // 8. CONCLUSÃO DINÂMICA
    add('conclusao_title', '<b>CONCLUSÃO</b>', 'report-section-title');

    // Linha 1 da conclusão: IG Biometria + Compatibilidade com Método Ativo
    const igBioSem = state.biometria.igBiometria.valid ? state.biometria.igBiometria.semanas : 'X';
    const igBioDias = state.biometria.igBiometria.valid ? state.biometria.igBiometria.dias : 'X';
    const margemDias = state.biometria.igBiometria.valid ? state.biometria.igBiometria.margemDias : 14;

    let percentilFrase = '';
    if (state.biometria.percentil !== null) {
      percentilFrase = ` (percentil ${state.biometria.percentil} de Hadlock)`;
    }

    let desenvTxt = 'com adequado desenvolvimento fetal';
    if (state.conclusao.crescimento === 'restricao') {
      desenvTxt = 'com restrição de crescimento fetal';
    } else if (state.conclusao.crescimento === 'macrossomia') {
      desenvTxt = 'com padrão de macrossomia fetal';
    } else if (state.conclusao.crescimento === 'pigm') {
      desenvTxt = 'com feto pequeno para a idade gestacional';
    } else if (state.conclusao.crescimento === 'gigm') {
      desenvTxt = 'com feto grande para a idade gestacional';
    }

    let compatibilidadeFrase = '';
    if (state.cronologia.igAtiva.valid) {
      const { semanas, dias, metodo } = state.cronologia.igAtiva;
      const refSemTxt = semanas !== null && semanas !== undefined ? `${semanas}` : 'X';
      const refDiasTxt = dias !== null && dias !== undefined ? `${dias}` : '0';

      let metodoFrase = 'estimada pela DUM';
      if (metodo === 'primeira_usg') {
        metodoFrase = 'estimada segundo exame ultrassonográfico inicial';
      } else if (metodo !== 'dum') {
        metodoFrase = 'referida';
      }

      compatibilidadeFrase = `<span data-static-slot="compat_pre"> Compatível com </span><span data-slot="compat_sem">${refSemTxt}</span><span data-static-slot="compat_mid1"> semanas e </span><span data-slot="compat_dias">${refDiasTxt}</span><span data-static-slot="compat_mid2"> dias de idade gestacional </span><span data-slot="compat_metodo">${metodoFrase}</span><span data-static-slot="compat_mid3">, </span><span data-slot="compat_cresc">${desenvTxt}</span><span data-slot="compat_perc">${percentilFrase}</span><span data-static-slot="compat_pos">.</span>`;
    }

    add('conclusao_l1', `<span data-static-slot="bio_pre">- Gestação tópica, com idade gestacional estimada pela biometria do presente exame em </span><span data-slot="bio_sem">${igBioSem}</span><span data-static-slot="bio_mid"> semanas e </span><span data-slot="bio_dias">${igBioDias}</span><span data-static-slot="bio_marg_pre"> dias (+/- </span><span data-slot="bio_margem">${margemDias}</span><span data-static-slot="bio_marg_pos"> dias).</span>${compatibilidadeFrase}`);
    add('sp_concl_1', '&nbsp;', 'report-blank-line');

    // Linha 2 da conclusão: Movimentação fetal
    if (state.conclusao.vitalidade === 'adequada') {
      add('conclusao_l2', '<span data-static-slot="vital_txt">- Movimentação fetal adequada.</span>');
    } else {
      add('conclusao_l2', '<span data-static-slot="vital_txt">- Movimentação fetal reduzida durante o exame.</span>');
    }
    add('sp_concl_2', '&nbsp;', 'report-blank-line');

    // Linha 3 da conclusão: Reflexo direto da classificação do Líquido Amniótico
    if (classif === 'normal') {
      add('conclusao_l3', '<span data-static-slot="liq_txt">- Volume de líquido amniótico normal.</span>');
    } else if (classif === 'diminuido') {
      add('conclusao_l3', '<span data-static-slot="liq_txt">- Volume de líquido amniótico no limite inferior da normalidade.</span>');
    } else if (classif === 'oligoidramnio') {
      add('conclusao_l3', '<span data-static-slot="liq_txt">- Volume de líquido amniótico diminuído (oligoidrâmnio).</span>');
    } else if (classif === 'aumentado') {
      add('conclusao_l3', '<span data-static-slot="liq_txt">- Volume de líquido amniótico no limite superior da normalidade.</span>');
    } else if (classif === 'polidramnio') {
      add('conclusao_l3', '<span data-static-slot="liq_txt">- Volume de líquido amniótico aumentado (polidrâmnio).</span>');
    }

    // Observações adicionais na conclusão se informadas
    if (state.conclusao.obs && state.conclusao.obs.trim()) {
      add('sp_concl_obs', '&nbsp;', 'report-blank-line');
      add('conclusao_obs', `<span data-static-slot="concl_obs_pre">- </span><span data-slot="concl_obs">${state.conclusao.obs.trim()}</span>`);
    }

    // 9. NOTA MÉDICA PADRONIZADA FINAL
    if (state.conclusao.notaFinal) {
      add('sp_concl_nota', '&nbsp;', 'report-blank-line');
      add('conclusao_nota', '<span data-static-slot="nota_txt">Nota: O principal objetivo do ultrassom obstétrico é avaliar o crescimento e a vitalidade fetal. Não tem finalidade de rastreamento e diagnóstico de doenças genéticas e/ou malformações fetais. Fatores como biotipo materno, posição fetal e volume de líquido amniótico podem limitar a visibilização de algumas estruturas. A normalidade deste exame não exclui a totalidade de alterações estruturais ou genéticas.</span>', 'report-note');
    }

    syncReportBlocks(blocks);
  }
  // =========================================================================
  // 9. CÓPIA RICA PARA CLIPBOARD (PRESERVA FORMATAÇÃO EXATA NO WORD)
  // =========================================================================

  async function copyReportRichText() {
    if (!dom.reportPaper) return;
    const igAtiva = state.cronologia.igAtiva;
    const isSemanaValida = igAtiva && igAtiva.valid && Number.isInteger(igAtiva.semanas) && igAtiva.semanas >= 16 && igAtiva.semanas <= 41;
    if (!isSemanaValida) {
      showToast('Defina a idade gestacional na Seção 1 para gerar e copiar o laudo.');
      return;
    }

    let richHtml = dom.reportPaper.innerHTML;

    // Remover atributos data-block, data-slot, data-static-slot, data-manual-edit, data-custom (não devem ir para o Word)
    richHtml = richHtml.replace(/\s*data-(slot|static-slot|block|manual-edit|custom|custom-origin)="[^"]*"/g, '');
    while (/<span>([\s\S]*?)<\/span>/i.test(richHtml)) {
      richHtml = richHtml.replace(/<span>([\s\S]*?)<\/span>/gi, '$1');
    }

    richHtml = richHtml.replace(
      /<p class="report-blank-line"[^>]*>[\s\S]*?<\/p>/gi,
      '<p class="report-blank-line" style="margin: 0pt; padding: 0pt; mso-para-margin: 0pt; font-size: 11pt; line-height: 1.25;">&nbsp;</p>'
    );

    const formattedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {
  font-family: Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.25;
  color: #000000;
  text-align: justify;
}
p {
  margin: 0;
  padding: 0;
  line-height: 1.25;
  mso-para-margin: 0pt;
}
.report-title {
  text-align: center;
  font-weight: bold;
  margin-bottom: 0pt;
  mso-para-margin-bottom: 0pt;
}
.report-blank-line {
  margin: 0;
  padding: 0;
  line-height: 1.25;
  font-size: 11pt;
  mso-para-margin: 0pt;
}
.report-section-title {
  font-weight: bold;
  text-transform: uppercase;
  margin-top: 0pt;
  margin-bottom: 0pt;
  mso-para-margin-top: 0pt;
  mso-para-margin-bottom: 0pt;
}
.report-note {
  font-size: 10pt;
  color: #1a1a1a;
  margin-top: 0pt;
  mso-para-margin-top: 0pt;
}
b, strong {
  font-weight: bold;
}
</style>
</head>
<body>
${richHtml}
</body>
</html>`;

    const plainText = dom.reportPaper.innerText;

    let success = false;
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const blobHtml = new Blob([formattedHtml], { type: 'text/html' });
        const blobText = new Blob([plainText], { type: 'text/plain' });
        const item = new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText
        });
        await navigator.clipboard.write([item]);
        success = true;
      } catch (err) {
        console.warn('ClipboardItem fallback:', err);
      }
    }

    if (!success) {
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(dom.reportPaper);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
        success = true;
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
    }

    showToast(success ? 'Laudo copiado com formatação rica para o Word!' : 'Falha ao copiar laudo.');
  }

  function showToast(message) {
    if (!dom.toastNotice || !dom.toastMessage) return;
    dom.toastMessage.textContent = message;
    dom.toastNotice.classList.add('show');
    setTimeout(() => {
      dom.toastNotice.classList.remove('show');
    }, 3200);
  }

  // =========================================================================
  // 10. SINCRONIZAÇÃO E RESET PARA VALORES PADRÃO LIMPOS
  // =========================================================================

  function resetToDefault() {
    state.isManualEdit = false;
    state.manualEditBlocks.clear();
    state.deletedBlocks.clear();
    state.lastGeneratedBlocks = {};
    state.userEditedSlots     = {};
    state.lastGeneratedSlots  = {};
    state.currentRenderedWeek = null;
    state.savedPaperHtml      = null;
    state.savedPaperWeek      = null;
    if (dom.manualEditBadge) dom.manualEditBadge.style.display = 'none';
    if (dom.laudoStatusText) dom.laudoStatusText.textContent = 'Aguardando Idade Gestacional';
    if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'none';
    dom.reportPaper.innerHTML = '';

    // Cronologia limpa
    state.cronologia.dumStatus = 'sim';
    state.cronologia.dum = '';
    state.cronologia.dumCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    state.cronologia.dumPadrao = true;
    state.cronologia.metodoAlternativo = 'primeira_usg';
    state.cronologia.primeiraUsgData = '';
    state.cronologia.primeiraUsgSem = '';
    state.cronologia.primeiraUsgDias = '';
    state.cronologia.primeiraUsgCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
    state.cronologia.igReferidaSem = '';
    state.cronologia.igReferidaDias = '';
    state.cronologia.igAtiva = { valid: false, semanas: null, dias: null, metodo: null, origemTexto: '', dpp: '' };
    // Estática (Gestação única exclusiva)
    state.estatica.situacao = 'longitudinal';
    state.estatica.apresentacao = 'cefalica';
    state.estatica.dorso = 'direita';
    state.estatica.movimentacao = 'ativa_normal';

    // BCF limpo
    state.bcf = '';

    // Placenta padrão
    state.placenta.insercao = 'corporal anterior';
    state.placenta.grau = 'I';
    state.placenta.espessura = '';
    state.placenta.cordao = 'tres_vasos';

    // Líquido amniótico estritamente VAZIO (sem valores fictícios)
    state.liquido.ila = '';
    state.liquido.maiorBolsao = '';
    state.liquido.classificacao = 'normal';
    state.liquido.statusRef = 'aguardando';

    // Morfologia padrão
    state.morfologia.padrao = true;
    state.morfologia.obs = '';

    // Biometria limpa
    state.biometria.dbp = '';
    state.biometria.dof = '';
    state.biometria.cc = '';
    state.biometria.ca = '';
    state.biometria.cf = '';
    state.biometria.cu = '';
    state.biometria.ccCa = null;
    state.biometria.indiceCefalico = null;
    state.biometria.peso = null;
    state.biometria.percentil = null;
    state.biometria.igBiometria = { valid: false, semanas: 0, dias: 0, margemDias: 14 };

    // Conclusão padrão
    state.conclusao.crescimento = 'adequado';
    state.conclusao.vitalidade = 'adequada';
    state.conclusao.obs = '';
    state.conclusao.notaFinal = true;

    syncDomFromState();
    updateActiveGestationalAge();
  }

  function syncDomFromState() {
    const cron = state.cronologia;

    // Cronologia DUM
    if (dom.selDumStatus) dom.selDumStatus.value = cron.dumStatus;
    if (dom.inputDum) dom.inputDum.value = cron.dum;
    if (dom.containerDum) dom.containerDum.style.display = cron.dumStatus === 'sim' ? 'block' : 'none';

    if (dom.btnDumPadraoSim && dom.btnDumPadraoNao) {
      dom.btnDumPadraoSim.classList.toggle('active', cron.dumPadrao);
      dom.btnDumPadraoNao.classList.toggle('active', !cron.dumPadrao);
    }

    // Container Alternativo
    const mostrarAlternativo = cron.dumStatus !== 'sim' || !cron.dumPadrao;
    if (dom.containerDatacaoAlternativa) {
      dom.containerDatacaoAlternativa.style.display = mostrarAlternativo ? 'block' : 'none';
    }

    if (dom.btnMetodoPrimeiraUsg && dom.btnMetodoReferida) {
      dom.btnMetodoPrimeiraUsg.classList.toggle('active', cron.metodoAlternativo === 'primeira_usg');
      dom.btnMetodoReferida.classList.toggle('active', cron.metodoAlternativo === 'referida');
    }

    if (dom.panelPrimeiraUsg) dom.panelPrimeiraUsg.style.display = cron.metodoAlternativo === 'primeira_usg' ? 'block' : 'none';
    if (dom.panelIgReferida) dom.panelIgReferida.style.display = cron.metodoAlternativo === 'referida' ? 'block' : 'none';

    if (dom.inputPrimeiraUsgData) dom.inputPrimeiraUsgData.value = cron.primeiraUsgData;
    if (dom.inputPrimeiraUsgSem) dom.inputPrimeiraUsgSem.value = cron.primeiraUsgSem;
    if (dom.inputPrimeiraUsgDias) dom.inputPrimeiraUsgDias.value = cron.primeiraUsgDias;

    if (dom.inputIgReferidaSem) dom.inputIgReferidaSem.value = cron.igReferidaSem;
    if (dom.inputIgReferidaDias) dom.inputIgReferidaDias.value = cron.igReferidaDias;


    // Estática
    if (dom.selSituacao) dom.selSituacao.value = state.estatica.situacao;
    if (dom.selApresentacao) dom.selApresentacao.value = state.estatica.apresentacao;
    if (dom.selDorso) dom.selDorso.value = state.estatica.dorso;
    if (dom.selMovimentacao) dom.selMovimentacao.value = state.estatica.movimentacao;

    // BCF
    if (dom.inputFcf) dom.inputFcf.value = state.bcf;

    // Placenta
    if (dom.selPlacentaInsercao) dom.selPlacentaInsercao.value = state.placenta.insercao;
    if (dom.selPlacentaGrau) dom.selPlacentaGrau.value = state.placenta.grau;
    if (dom.inputPlacentaEspessura) dom.inputPlacentaEspessura.value = state.placenta.espessura;
    if (dom.selCordao) dom.selCordao.value = state.placenta.cordao;

    // Líquido Amniótico (limpos)
    if (dom.inputIla) dom.inputIla.value = state.liquido.ila;
    if (dom.inputMaiorBolsao) dom.inputMaiorBolsao.value = state.liquido.maiorBolsao;
    if (dom.selIlaClassificacao) dom.selIlaClassificacao.value = state.liquido.classificacao;

    // Morfologia
    if (dom.btnMorfoPadrao && dom.btnMorfoPersonalizada) {
      dom.btnMorfoPadrao.classList.toggle('active', state.morfologia.padrao);
      dom.btnMorfoPersonalizada.classList.toggle('active', !state.morfologia.padrao);
    }
    if (dom.morfoPadraoInfo) dom.morfoPadraoInfo.style.display = state.morfologia.padrao ? 'flex' : 'none';
    if (dom.morfoPersonalizadaPanel) dom.morfoPersonalizadaPanel.style.display = state.morfologia.padrao ? 'none' : 'block';
    if (dom.inputMorfoObs) dom.inputMorfoObs.value = state.morfologia.obs;

    // Biometria
    if (dom.inputDbp) dom.inputDbp.value = state.biometria.dbp;
    if (dom.inputDof) dom.inputDof.value = state.biometria.dof;
    if (dom.inputCc) dom.inputCc.value = state.biometria.cc;
    if (dom.inputCa) dom.inputCa.value = state.biometria.ca;
    if (dom.inputCf) dom.inputCf.value = state.biometria.cf;
    if (dom.inputCu) dom.inputCu.value = state.biometria.cu;

    // Conclusão
    if (dom.selConclusaoCrescimento) dom.selConclusaoCrescimento.value = state.conclusao.crescimento;
    if (dom.selConclusaoVitalidade) dom.selConclusaoVitalidade.value = state.conclusao.vitalidade;
    if (dom.inputConclusaoObs) dom.inputConclusaoObs.value = state.conclusao.obs;
    if (dom.btnNotaFinalSim && dom.btnNotaFinalNao) {
      dom.btnNotaFinalSim.classList.toggle('active', state.conclusao.notaFinal);
      dom.btnNotaFinalNao.classList.toggle('active', !state.conclusao.notaFinal);
    }
  }

  // =========================================================================
  // 11. INICIALIZAÇÃO DE EVENTOS
  // =========================================================================

  function initEvents() {
    // Tema claro / escuro
    if (dom.themeToggleBtn) {
      dom.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Cronologia: DUM
    if (dom.selDumStatus) {
      dom.selDumStatus.addEventListener('change', () => {
        state.cronologia.dumStatus = dom.selDumStatus.value;
        const sabeDum = state.cronologia.dumStatus === 'sim';
        if (dom.containerDum) dom.containerDum.style.display = sabeDum ? 'block' : 'none';

        if (!sabeDum) {
          state.cronologia.dum = '';
          state.cronologia.dumCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
          if (dom.dumFeedbackBox) dom.dumFeedbackBox.style.display = 'none';
        }

        // Se sabe DUM e DUM padrão for SIM, esconde o alternativo. Caso contrário, mostra.
        const mostrarAlternativo = !sabeDum || !state.cronologia.dumPadrao;
        if (dom.containerDatacaoAlternativa) {
          dom.containerDatacaoAlternativa.style.display = mostrarAlternativo ? 'block' : 'none';
        }

        updateActiveGestationalAge();
      });
    }

    if (dom.inputDum) {
      dom.inputDum.addEventListener('input', (e) => {
        e.target.value = applyDateMask(e.target.value);
        state.cronologia.dum = e.target.value;
        const parsed = parseDateBR(state.cronologia.dum);
        if (parsed) {
          state.cronologia.dumCalculada = calculateGestationalAgeByDum(parsed);
          if (state.cronologia.dumCalculada.valid) {
            dom.dumIgDisplay.textContent = `${state.cronologia.dumCalculada.semanas} sem e ${state.cronologia.dumCalculada.dias} dias (DPP: ${state.cronologia.dumCalculada.dpp})`;
            dom.dumFeedbackBox.style.display = 'flex';
          } else {
            dom.dumFeedbackBox.style.display = 'none';
          }
        } else {
          state.cronologia.dumCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
          dom.dumFeedbackBox.style.display = 'none';
        }
        updateActiveGestationalAge();
      });
    }

    // Toggle: Usar data da DUM como idade gestacional padrão?
    if (dom.btnDumPadraoSim) {
      dom.btnDumPadraoSim.addEventListener('click', () => {
        state.cronologia.dumPadrao = true;
        dom.btnDumPadraoSim.classList.add('active');
        dom.btnDumPadraoNao.classList.remove('active');
        if (dom.containerDatacaoAlternativa) dom.containerDatacaoAlternativa.style.display = 'none';
        updateActiveGestationalAge();
      });
    }

    if (dom.btnDumPadraoNao) {
      dom.btnDumPadraoNao.addEventListener('click', () => {
        state.cronologia.dumPadrao = false;
        dom.btnDumPadraoSim.classList.remove('active');
        dom.btnDumPadraoNao.classList.add('active');
        if (dom.containerDatacaoAlternativa) dom.containerDatacaoAlternativa.style.display = 'block';
        updateActiveGestationalAge();
      });
    }

    // Seletor de Método Alternativo: 1ª USG vs IG Referida
    if (dom.btnMetodoPrimeiraUsg) {
      dom.btnMetodoPrimeiraUsg.addEventListener('click', () => {
        state.cronologia.metodoAlternativo = 'primeira_usg';
        dom.btnMetodoPrimeiraUsg.classList.add('active');
        dom.btnMetodoReferida.classList.remove('active');
        if (dom.panelPrimeiraUsg) dom.panelPrimeiraUsg.style.display = 'block';
        if (dom.panelIgReferida) dom.panelIgReferida.style.display = 'none';
        updateActiveGestationalAge();
      });
    }

    if (dom.btnMetodoReferida) {
      dom.btnMetodoReferida.addEventListener('click', () => {
        state.cronologia.metodoAlternativo = 'referida';
        dom.btnMetodoPrimeiraUsg.classList.remove('active');
        dom.btnMetodoReferida.classList.add('active');
        if (dom.panelPrimeiraUsg) dom.panelPrimeiraUsg.style.display = 'none';
        if (dom.panelIgReferida) dom.panelIgReferida.style.display = 'block';
        updateActiveGestationalAge();
      });
    }

    // Opção A: Primeira Ultrassonografia
    const triggerPrimeiraUsgCalc = () => {
      const dt = parseDateBR(dom.inputPrimeiraUsgData.value);
      const sem = parseInt(dom.inputPrimeiraUsgSem.value, 10);
      const dias = parseInt(dom.inputPrimeiraUsgDias.value, 10) || 0;
      state.cronologia.primeiraUsgData = dom.inputPrimeiraUsgData.value;
      state.cronologia.primeiraUsgSem = dom.inputPrimeiraUsgSem.value;
      state.cronologia.primeiraUsgDias = dom.inputPrimeiraUsgDias.value;

      if (dt && !isNaN(sem)) {
        state.cronologia.primeiraUsgCalculada = calculateGestationalAgeByInitialExam(dt, sem, dias);
        if (state.cronologia.primeiraUsgCalculada.valid) {
          dom.primeiraUsgIgDisplay.textContent = `${state.cronologia.primeiraUsgCalculada.semanas} sem e ${state.cronologia.primeiraUsgCalculada.dias} dias (DPP: ${state.cronologia.primeiraUsgCalculada.dpp})`;
          dom.primeiraUsgFeedbackBox.style.display = 'flex';
        } else {
          dom.primeiraUsgFeedbackBox.style.display = 'none';
        }
      } else {
        state.cronologia.primeiraUsgCalculada = { valid: false, semanas: 0, dias: 0, dpp: '', diasTotais: 0 };
        dom.primeiraUsgFeedbackBox.style.display = 'none';
      }
      updateActiveGestationalAge();
    };

    if (dom.inputPrimeiraUsgData) {
      dom.inputPrimeiraUsgData.addEventListener('input', (e) => {
        e.target.value = applyDateMask(e.target.value);
        triggerPrimeiraUsgCalc();
      });
    }
    if (dom.inputPrimeiraUsgSem) dom.inputPrimeiraUsgSem.addEventListener('input', triggerPrimeiraUsgCalc);
    if (dom.inputPrimeiraUsgDias) dom.inputPrimeiraUsgDias.addEventListener('input', triggerPrimeiraUsgCalc);

    // Opção B: IG Referida
    if (dom.inputIgReferidaSem) {
      dom.inputIgReferidaSem.addEventListener('input', () => {
        state.cronologia.igReferidaSem = dom.inputIgReferidaSem.value;
        updateActiveGestationalAge();
      });
    }
    if (dom.inputIgReferidaDias) {
      dom.inputIgReferidaDias.addEventListener('input', () => {
        state.cronologia.igReferidaDias = dom.inputIgReferidaDias.value;
        updateActiveGestationalAge();
      });
    }


    // Estática (Gestação Única)
    if (dom.selSituacao) dom.selSituacao.addEventListener('change', () => { state.estatica.situacao = dom.selSituacao.value; renderReportText(); });
    if (dom.selApresentacao) dom.selApresentacao.addEventListener('change', () => { state.estatica.apresentacao = dom.selApresentacao.value; renderReportText(); });
    if (dom.selDorso) dom.selDorso.addEventListener('change', () => { state.estatica.dorso = dom.selDorso.value; renderReportText(); });
    if (dom.selMovimentacao) dom.selMovimentacao.addEventListener('change', () => { state.estatica.movimentacao = dom.selMovimentacao.value; renderReportText(); });

    // BCF (Seção Própria Independente)
    if (dom.inputFcf) {
      dom.inputFcf.addEventListener('input', () => {
        state.bcf = dom.inputFcf.value;
        renderReportText();
      });
    }

    // Placenta
    if (dom.selPlacentaInsercao) dom.selPlacentaInsercao.addEventListener('change', () => { state.placenta.insercao = dom.selPlacentaInsercao.value; renderReportText(); });
    if (dom.selPlacentaGrau) dom.selPlacentaGrau.addEventListener('change', () => { state.placenta.grau = dom.selPlacentaGrau.value; renderReportText(); });
    if (dom.inputPlacentaEspessura) dom.inputPlacentaEspessura.addEventListener('input', () => { state.placenta.espessura = dom.inputPlacentaEspessura.value; renderReportText(); });
    if (dom.selCordao) dom.selCordao.addEventListener('change', () => { state.placenta.cordao = dom.selCordao.value; renderReportText(); });

    // Líquido Amniótico (Apenas ILA e Maior Bolsão)
    if (dom.inputIla) {
      dom.inputIla.addEventListener('input', () => {
        state.liquido.ila = dom.inputIla.value;
        checkIlaClassification();
        renderReportText();
      });
    }
    if (dom.inputMaiorBolsao) {
      dom.inputMaiorBolsao.addEventListener('input', () => {
        state.liquido.maiorBolsao = dom.inputMaiorBolsao.value;
        checkIlaClassification();
        renderReportText();
      });
    }
    if (dom.selIlaClassificacao) {
      dom.selIlaClassificacao.addEventListener('change', () => {
        state.liquido.classificacao = dom.selIlaClassificacao.value;
        renderReportText();
      });
    }

    // Morfologia
    if (dom.btnMorfoPadrao) {
      dom.btnMorfoPadrao.addEventListener('click', () => {
        state.morfologia.padrao = true;
        dom.btnMorfoPadrao.classList.add('active');
        dom.btnMorfoPersonalizada.classList.remove('active');
        dom.morfoPadraoInfo.style.display = 'flex';
        dom.morfoPersonalizadaPanel.style.display = 'none';
        renderReportText();
      });
    }
    if (dom.btnMorfoPersonalizada) {
      dom.btnMorfoPersonalizada.addEventListener('click', () => {
        state.morfologia.padrao = false;
        dom.btnMorfoPadrao.classList.remove('active');
        dom.btnMorfoPersonalizada.classList.add('active');
        dom.morfoPadraoInfo.style.display = 'none';
        dom.morfoPersonalizadaPanel.style.display = 'block';
        renderReportText();
      });
    }
    if (dom.inputMorfoObs) dom.inputMorfoObs.addEventListener('input', () => { state.morfologia.obs = dom.inputMorfoObs.value; renderReportText(); });

    // Biometria
    const biometriaInputs = [
      { el: dom.inputDbp, key: 'dbp' },
      { el: dom.inputDof, key: 'dof' },
      { el: dom.inputCc,  key: 'cc' },
      { el: dom.inputCa,  key: 'ca' },
      { el: dom.inputCf,  key: 'cf' },
      { el: dom.inputCu,  key: 'cu' }
    ];

    biometriaInputs.forEach(item => {
      if (item.el) {
        item.el.addEventListener('input', () => {
          state.biometria[item.key] = item.el.value;
          calculateBiometry();
          renderReportText();
        });
      }
    });

    // Conclusão
    if (dom.selConclusaoCrescimento) dom.selConclusaoCrescimento.addEventListener('change', () => { state.conclusao.crescimento = dom.selConclusaoCrescimento.value; renderReportText(); });
    if (dom.selConclusaoVitalidade) dom.selConclusaoVitalidade.addEventListener('change', () => { state.conclusao.vitalidade = dom.selConclusaoVitalidade.value; renderReportText(); });
    if (dom.inputConclusaoObs) dom.inputConclusaoObs.addEventListener('input', () => { state.conclusao.obs = dom.inputConclusaoObs.value; renderReportText(); });
    if (dom.btnNotaFinalSim) {
      dom.btnNotaFinalSim.addEventListener('click', () => {
        state.conclusao.notaFinal = true;
        dom.btnNotaFinalSim.classList.add('active');
        dom.btnNotaFinalNao.classList.remove('active');
        renderReportText();
      });
    }
    if (dom.btnNotaFinalNao) {
      dom.btnNotaFinalNao.addEventListener('click', () => {
        state.conclusao.notaFinal = false;
        dom.btnNotaFinalSim.classList.remove('active');
        dom.btnNotaFinalNao.classList.add('active');
        renderReportText();
      });
    }

    function handleReportPaperInput(e) {
      if (!dom.reportPaper) return;

      // 1. Identificar elemento / nó sob o cursor (caret), mesmo se e.target for #reportPaper
      const activeEl = getActiveCaretElement(dom.reportPaper) ||
                       (e && e.target && e.target !== dom.reportPaper && dom.reportPaper.contains(e.target) ? e.target : null);

      if (activeEl && activeEl !== dom.reportPaper) {
        const slotEl = activeEl.closest ? activeEl.closest('[data-slot], [data-static-slot]') : null;
        const blockEl = activeEl.closest ? activeEl.closest('[data-block]') : null;

        if (slotEl && blockEl && dom.reportPaper.contains(blockEl)) {
          const blockId = blockEl.getAttribute('data-block');
          const slotKey = getSlotKeyFromElement(slotEl);
          if (blockId && slotKey) {
            if (!state.userEditedSlots[blockId]) state.userEditedSlots[blockId] = new Set();
            state.userEditedSlots[blockId].add(slotKey);
          }
        } else if (blockEl && dom.reportPaper.contains(blockEl)) {
          const blockId = blockEl.getAttribute('data-block');
          const genSlots = state.lastGeneratedSlots[blockId];
          const hasKnownSlots = genSlots && Object.keys(genSlots).length > 0;
          // Se o bloco NÃO possui slots (título, frase puramente fixa), registrar em manualEditBlocks
          if (!hasKnownSlots && blockId) {
            state.manualEditBlocks.add(blockId);
            blockEl.setAttribute('data-manual-edit', 'true');
          }
        } else {
          // Elemento solto / parágrafo customizado
          activeEl.setAttribute('data-custom', 'true');
        }
      }

      // 2. SCANNING INTEGRAL DOS SLOTS:
      // Compara o conteúdo real de todos os slots no DOM com o valor gerado.
      // Garante detecção perfeita mesmo em seleções amplas, Backspace, Delete, Cut ou Paste.
      const domBlocks = dom.reportPaper.querySelectorAll(':scope > [data-block]');
      const existingBlockIds = new Set();

      domBlocks.forEach(blockEl => {
        const blockId = blockEl.getAttribute('data-block');
        if (!blockId) return;
        existingBlockIds.add(blockId);

        const genSlots = state.lastGeneratedSlots[blockId];
        if (genSlots && Object.keys(genSlots).length > 0) {
          Object.keys(genSlots).forEach(slotKey => {
            const expectedVal = genSlots[slotKey];
            const slotEl = findSlotElement(blockEl, slotKey);
            if (!slotEl) {
              // Slot foi removido pelo usuário
              if (!state.userEditedSlots[blockId]) state.userEditedSlots[blockId] = new Set();
              state.userEditedSlots[blockId].add(slotKey);
            } else if (normalizeContent(slotEl.innerHTML) !== normalizeContent(expectedVal)) {
              // Valor do slot foi editado manualmente
              if (!state.userEditedSlots[blockId]) state.userEditedSlots[blockId] = new Set();
              state.userEditedSlots[blockId].add(slotKey);
            }
          });
        } else {
          // Bloco sem slots: se diferir do gerado, marcar como editado
          if (state.lastGeneratedBlocks[blockId] !== undefined) {
            if (normalizeContent(blockEl.innerHTML) !== normalizeContent(state.lastGeneratedBlocks[blockId])) {
              state.manualEditBlocks.add(blockId);
              blockEl.setAttribute('data-manual-edit', 'true');
            }
          }
        }
      });

      // 3. Tratar quebras de parágrafo (Enter): desduplica data-block clonado pelo navegador
      const seen = new Set();
      dom.reportPaper.querySelectorAll('[data-block]').forEach(el => {
        const bid = el.getAttribute('data-block');
        if (seen.has(bid)) {
          el.removeAttribute('data-block');
          el.setAttribute('data-custom', 'true');
          el.querySelectorAll('[data-slot], [data-static-slot]').forEach(s => {
            s.removeAttribute('data-slot');
            s.removeAttribute('data-static-slot');
          });
        } else {
          seen.add(bid);
        }
      });

      // 4. Rastrear blocos excluídos
      Object.keys(state.lastGeneratedBlocks).forEach(id => {
        if (!existingBlockIds.has(id)) {
          state.deletedBlocks.add(id);
        }
      });

      // 5. Atualizar status e badge
      updateManualEditStatus();
    }

    // Edição manual do laudo
    if (dom.reportPaper) {
      dom.reportPaper.addEventListener('input', handleReportPaperInput);
      dom.reportPaper.addEventListener('paste', () => setTimeout(handleReportPaperInput, 10));
      dom.reportPaper.addEventListener('cut', () => setTimeout(handleReportPaperInput, 10));
    }

    // Restaurar Laudo Dinâmico
    if (dom.btnRestaurarLaudo) {
      dom.btnRestaurarLaudo.addEventListener('click', () => {
        state.isManualEdit = false;
        state.manualEditBlocks.clear();
        state.deletedBlocks.clear();
        state.lastGeneratedBlocks = {};
        state.userEditedSlots     = {};
        state.lastGeneratedSlots  = {};
        if (dom.manualEditBadge) dom.manualEditBadge.style.display = 'none';
        if (dom.btnRestaurarLaudo) dom.btnRestaurarLaudo.style.display = 'none';
        if (dom.laudoStatusText) dom.laudoStatusText.textContent = 'Laudo Dinâmico Sincronizado';
        dom.reportPaper.innerHTML = '';
        renderReportText();
        showToast('Laudo restaurado e sincronizado com os dados do formulário.');
      });
    }

    // Copiar Laudo (Rich Text)
    if (dom.btnCopiarLaudo) dom.btnCopiarLaudo.addEventListener('click', copyReportRichText);

    // Imprimir
    if (dom.btnImprimir) dom.btnImprimir.addEventListener('click', () => {
        const igAtiva = state.cronologia.igAtiva;
        const isSemanaValida = igAtiva && igAtiva.valid && Number.isInteger(igAtiva.semanas) && igAtiva.semanas >= 16 && igAtiva.semanas <= 41;
        if (!isSemanaValida) {
          showToast('Defina a idade gestacional na Seção 1 antes de imprimir o laudo.');
          return;
        }
        window.print();
      });

    // Modal de Novo Exame
    if (dom.btnNovoExame) {
      dom.btnNovoExame.addEventListener('click', () => {
        if (dom.modalNovoExame) dom.modalNovoExame.classList.add('active');
      });
    }
    if (dom.btnModalCancel) {
      dom.btnModalCancel.addEventListener('click', () => {
        if (dom.modalNovoExame) dom.modalNovoExame.classList.remove('active');
      });
    }
    if (dom.btnModalConfirm) {
      dom.btnModalConfirm.addEventListener('click', () => {
        if (dom.modalNovoExame) dom.modalNovoExame.classList.remove('active');
        resetToDefault();
        showToast('Novo exame iniciado com sucesso!');
      });
    }
  }

  // =========================================================================
  // 12. CONTROLE DE TEMA (CLARO / ESCURO)
  // =========================================================================

  function initTheme() {
    const savedTheme = localStorage.getItem('meuultrassom_theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      if (dom.themeIconSun) dom.themeIconSun.style.display = 'block';
      if (dom.themeIconMoon) dom.themeIconMoon.style.display = 'none';
    } else {
      document.body.classList.remove('dark-mode');
      if (dom.themeIconSun) dom.themeIconSun.style.display = 'none';
      if (dom.themeIconMoon) dom.themeIconMoon.style.display = 'block';
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('meuultrassom_theme', isDark ? 'dark' : 'light');
    if (dom.themeIconSun) dom.themeIconSun.style.display = isDark ? 'block' : 'none';
    if (dom.themeIconMoon) dom.themeIconMoon.style.display = isDark ? 'none' : 'block';
  }

  // =========================================================================
  // 13. INICIALIZAÇÃO DO MÓDULO
  // =========================================================================

  
  // =========================================================================
  // INTEGRAÇÃO COM NAVEGAÇÃO DA TELA INICIAL
  // =========================================================================

  function initNavigationData() {
    try {
      const raw = sessionStorage.getItem('meuultrassom_nav_data');
      if (raw) {
        const navData = JSON.parse(raw);
        if (navData && navData.tipoExame === 'simples' && navData.igCalculada && navData.igCalculada.valid) {
          const calc = navData.igCalculada;
          if (calc.metodo === 'dum' && calc.dumDate && dom.inputDum) {
            dom.inputDum.value = calc.dumDate;
            state.cronologia.dum = calc.dumDate;
            state.cronologia.dumStatus = 'sim';
            state.cronologia.dumPadrao = true;
            const parsed = parseDateBR(calc.dumDate);
            if (parsed) {
              state.cronologia.dumCalculada = calculateGestationalAgeByDum(parsed);
              if (state.cronologia.dumCalculada.valid) {
                dom.dumIgDisplay.textContent = `${state.cronologia.dumCalculada.semanas} sem e ${state.cronologia.dumCalculada.dias} dias (DPP: ${state.cronologia.dumCalculada.dpp})`;
                dom.dumFeedbackBox.style.display = 'flex';
              }
            }
            updateActiveGestationalAge();
          } else if (calc.metodo === 'primeira_usg' && dom.inputPrimeiraUsgData) {
            state.cronologia.dumStatus = 'nao';
            state.cronologia.dumPadrao = false;
            state.cronologia.metodoAlternativo = 'primeira_usg';
            if (dom.selDumStatus) dom.selDumStatus.value = 'nao';
            if (dom.containerDum) dom.containerDum.style.display = 'none';
            if (dom.containerDatacaoAlternativa) dom.containerDatacaoAlternativa.style.display = 'block';
            if (dom.btnMetodoPrimeiraUsg) dom.btnMetodoPrimeiraUsg.classList.add('active');
            if (dom.btnMetodoReferida) dom.btnMetodoReferida.classList.remove('active');
            if (dom.panelPrimeiraUsg) dom.panelPrimeiraUsg.style.display = 'block';
            if (dom.panelIgReferida) dom.panelIgReferida.style.display = 'none';
            dom.inputPrimeiraUsgData.value = calc.usgDate || '';
            dom.inputPrimeiraUsgSem.value = calc.usgWeeks || '';
            dom.inputPrimeiraUsgDias.value = calc.usgDays || '';
            state.cronologia.primeiraUsgData = calc.usgDate || '';
            state.cronologia.primeiraUsgSem = calc.usgWeeks || '';
            state.cronologia.primeiraUsgDias = calc.usgDays || '';
            const parsed = parseDateBR(calc.usgDate || '');
            const sem = parseInt(calc.usgWeeks, 10);
            const dias = parseInt(calc.usgDays || '0', 10);
            if (parsed && !isNaN(sem)) {
              state.cronologia.primeiraUsgCalculada = calculateGestationalAgeByFirstUsg(parsed, sem, isNaN(dias) ? 0 : dias);
              if (state.cronologia.primeiraUsgCalculada.valid) {
                dom.primeiraUsgIgDisplay.textContent = `${state.cronologia.primeiraUsgCalculada.semanas} sem e ${state.cronologia.primeiraUsgCalculada.dias} dias (DPP: ${state.cronologia.primeiraUsgCalculada.dpp})`;
                dom.primeiraUsgFeedbackBox.style.display = 'flex';
              }
            }
            updateActiveGestationalAge();
          }
        }
      }
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    initDom();
    initTheme();
    resetToDefault();
    initEvents();
    initNavigationData();
  });

  // Exportação para escopo controlado se necessário para testes manuais
  window.meuultrassomSimples = {
    state,
    calculateBiometry,
    renderReportText,
    resetToDefault,
    copyReportRichText
  };

})();
