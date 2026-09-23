import {
  computed,
  inject,
  provide,
  type ComputedRef,
  type InjectionKey,
} from "vue";
import { editorPortuguese } from "../locales/pt-PT";
export interface LocaleContext {
  locale: ComputedRef<string>;
  t: (text: string | undefined) => string;
}
const key: InjectionKey<LocaleContext> = Symbol("nle-locale");
const portuguese: Record<string, string> = {
  ...editorPortuguese,
  "Document tools": "Ferramentas do documento",
  Versions: "Versões",
  "Import Word": "Importar Word",
  "Export and pages": "Exportar e páginas",
  Accessibility: "Acessibilidade",
  Review: "Revisão",
  "AI writing": "Escrita com IA",
  References: "Referências",
  Structure: "Estrutura",
  Templates: "Modelos",
  Language: "Idioma",
  Collaboration: "Colaboração",
  Close: "Fechar",
  Cancel: "Cancelar",
  Apply: "Aplicar",
  Save: "Guardar",
  Delete: "Eliminar",
  Preview: "Pré-visualizar",
  Restore: "Restaurar",
  Compare: "Comparar",
  "Checkpoint name": "Nome da versão",
  "Save checkpoint": "Guardar versão",
  "Refresh versions": "Atualizar versões",
  "Local recovery available": "Recuperação local disponível",
  "Recover draft": "Recuperar rascunho",
  "Keep current draft": "Manter o rascunho atual",
  "No saved versions yet.": "Ainda não existem versões guardadas.",
  "Document history is unavailable for this document.":
    "O histórico não está disponível para este documento.",
  "Replace document": "Substituir documento",
  "Insert at selection": "Inserir na seleção",
  "Import accepted text": "Importar texto aceite",
  "Conversion report": "Relatório de conversão",
  "No content changes until you import.": "O conteúdo só muda quando importar.",
  "Choose a Word document": "Escolha um documento Word",
  "Run document check": "Verificar documento",
  Locate: "Localizar",
  Fix: "Corrigir",
  Ignore: "Ignorar",
  "Replacement value": "Valor de substituição",
  "No issues found by these checks.":
    "Estas verificações não encontraram problemas.",
  "These checks do not certify accessibility.":
    "Estas verificações não certificam a acessibilidade.",
  "Edit directly": "Editar diretamente",
  "Suggest changes": "Sugerir alterações",
  Accept: "Aceitar",
  Reject: "Rejeitar",
  "No pending suggestions.": "Não existem sugestões pendentes.",
  "Select a passage in the document first.":
    "Selecione primeiro um excerto do documento.",
  "Use selection": "Usar seleção",
  Action: "Ação",
  Clarify: "Clarificar",
  Shorten: "Encurtar",
  Tone: "Tom",
  Translate: "Traduzir",
  Instructions: "Instruções",
  "Generate proposal": "Gerar proposta",
  "Accept proposal": "Aceitar proposta",
  "AI rewriting is unavailable in this document.":
    "A reescrita com IA não está disponível neste documento.",
  "Text is sent only when you request a proposal.":
    "O texto só é enviado quando pedir uma proposta.",
  "Add footnote": "Adicionar nota",
  "Note text": "Texto da nota",
  "Add source": "Adicionar fonte",
  Author: "Autor",
  Title: "Título",
  Year: "Ano",
  Publisher: "Editora",
  URL: "URL",
  "Insert citation": "Inserir citação",
  "Refresh references": "Atualizar referências",
  "Citation style": "Estilo de citação",
  Numbered: "Numerado",
  "Move up": "Mover para cima",
  "Move down": "Mover para baixo",
  Duplicate: "Duplicar",
  "Include chapter contents": "Incluir conteúdo do capítulo",
  "Template fields (JSON)": "Campos do modelo (JSON)",
  "Preview data (JSON)": "Dados de exemplo (JSON)",
  "Preview template": "Pré-visualizar modelo",
  "Generate document": "Gerar documento",
  "Save field definitions": "Guardar definições dos campos",
  "UI language": "Idioma da interface",
  "Document language": "Idioma do documento",
  "Text direction": "Direção do texto",
  "Left to right": "Da esquerda para a direita",
  "Right to left": "Da direita para a esquerda",
  Automatic: "Automática",
  Paper: "Papel",
  Orientation: "Orientação",
  Portrait: "Vertical",
  Landscape: "Horizontal",
  "Margins (points)": "Margens (pontos)",
  Header: "Cabeçalho",
  Footer: "Rodapé",
  "Page numbers": "Números de página",
  "Save page settings": "Guardar configuração da página",
  "Create PDF preview": "Criar pré-visualização PDF",
  "Download PDF": "Transferir PDF",
  "Download Word": "Transferir Word",
  "Download HTML": "Transferir HTML",
  "Download Markdown": "Transferir Markdown",
  "Export warnings": "Avisos de exportação",
  Connected: "Ligado",
  Offline: "Sem ligação",
  Connecting: "A ligar",
  Error: "Erro",
  "No other participants.": "Não existem outros participantes.",
  "Live collaboration is unavailable in this document.":
    "A colaboração em tempo real não está disponível neste documento.",
  "Formatting changed.": "A formatação mudou.",
  "Rich text editor": "Editor de texto",
  "Start typing...": "Comece a escrever...",
  "English prose checks are unavailable for this document language.":
    "As verificações de escrita em inglês não estão disponíveis para este idioma.",
};
export function provideEditorLocale(
  locale: () => string,
  messages: () => Record<string, string> = () => ({}),
): LocaleContext {
  const selected = computed(locale);
  const context = {
    locale: selected,
    t: (text: string | undefined) => {
      const key = text ?? "";
      return (
        messages()[key] ??
        (selected.value.toLowerCase().startsWith("pt")
          ? (portuguese[key] ?? key)
          : key)
      );
    },
  };
  provide(key, context);
  return context;
}
export function useEditorLocale(): LocaleContext {
  return inject(key, {
    locale: computed(() => "en"),
    t: (text: string | undefined) => text ?? "",
  });
}
export const portugueseMessages = portuguese;
