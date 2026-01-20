/**
 * Provador Virtual / Ajustador de Medidas
 * 
 * Sistema completo de recomendação de tamanhos baseado em medidas antropométricas estimadas.
 * 
 * Componentes:
 * - FittingTrigger: Botão para abrir o provador virtual na página do produto
 * - FittingModal: Modal principal com fluxo de 3 passos
 * - StepInputs: Coleta de dados básicos (Altura, Peso, Idade, Gênero)
 * - StepShape: Ajuste visual do formato do corpo com sliders e manequim
 * - StepResult: Resultado da recomendação com feedback de ajuste
 * - DynamicMannequin: Componente de manequim 3D SVG manipulável
 * 
 * Hooks:
 * - useFittingAlgorithm: Calcula medidas estimadas baseado em IMC e ajustes
 * 
 * Utilitários:
 * - saveUserMeasurements: Salva medidas no perfil do usuário no Firestore
 * - getUserMeasurements: Busca medidas salvas do usuário
 */

export { FittingTrigger } from "./FittingTrigger";
export { FittingModal } from "./FittingModal";
export { StepInputs } from "./StepInputs";
export { StepShape } from "./StepShape";
export { StepResult } from "./StepResult";
export { DynamicMannequin, SKIN_TONE_PALETTE } from "./DynamicMannequin";

export { useFittingAlgorithm, recommendSize } from "@/hooks/useFittingAlgorithm";
export type { FittingInputs, EstimatedMeasurements } from "@/hooks/useFittingAlgorithm";

export { saveUserMeasurements, getUserMeasurements, getUserProfile } from "@/lib/firestore/user-profile";
export type { UserMeasurements, UserProfile } from "@/lib/firestore/user-profile";
