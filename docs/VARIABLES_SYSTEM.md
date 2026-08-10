# Sistema de Variáveis 🔤

Sistema completo de variáveis template tipo `{{ variableName }}` para o Next Level Editor, com destaque visual estilo "pill/badge" e autocomplete inteligente, similar ao CKEditor.

## ✨ Características

- **Sintaxe Simples**: Use `{{ variableName }}` para inserir variáveis
- **Autocomplete Inteligente**: Digite `{{` para ativar o autocomplete
- **Destaque Visual**: Variáveis aparecem como pills coloridas e estilizadas
- **Categorias Organizadas**: Variáveis agrupadas por categoria (User, Date, Document, Company)
- **Tooltips Informativos**: Descrições aparecem ao passar o mouse
- **Navegação por Teclado**: Use ↑↓ para navegar, Enter/Tab para inserir, Esc para fechar
- **Tema Claro/Escuro**: Suporte completo para ambos os temas
- **Print-Friendly**: Variáveis são substituídas por seus valores ao imprimir
- **Acessibilidade**: WCAG AAA compliant

## 📦 Instalação

O sistema de variáveis está incluído no Next Level Editor. Basta ativar o recurso:

```vue
<NextLevelEditor v-model="content" :enable-variables="true" />
```

## 🚀 Uso Básico

### No Template Vue

```vue
<template>
  <NextLevelEditor
    v-model="documentContent"
    :enable-variables="true"
    placeholder="Digite {{ para inserir variáveis..."
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { NextLevelEditor } from "next-level-editor";

const documentContent = ref(`
  <h1>Olá {{ user.name }}!</h1>
  <p>Hoje é {{ date.today }}</p>
`);
</script>
```

### Usando o Composable Diretamente

```typescript
import { useVariables } from "next-level-editor";

const {
  variables,
  categories,
  insertVariable,
  replaceVariables,
  searchVariables,
  addVariable,
} = useVariables();

// Inserir variável no editor
insertVariable(editorElement, "user.name");

// Substituir variáveis por valores
const text = "Hello {{ user.name }}, today is {{ date.today }}";
const replaced = replaceVariables(text);
// Output: "Hello John Doe, today is 11/10/2025"

// Buscar variáveis
const results = searchVariables("date");
// Retorna todas as variáveis relacionadas a data
```

## 🎨 Variáveis Disponíveis

### 👤 User (Usuário)

- `{{ user.name }}` - Nome completo do usuário
- `{{ user.email }}` - Email do usuário
- `{{ user.firstName }}` - Primeiro nome
- `{{ user.lastName }}` - Sobrenome

### 📅 Date & Time (Data e Hora)

- `{{ date.today }}` - Data atual (formato local)
- `{{ date.now }}` - Hora atual (formato local)
- `{{ date.year }}` - Ano atual
- `{{ date.month }}` - Mês atual

### 📄 Document (Documento)

- `{{ doc.title }}` - Título do documento
- `{{ doc.author }}` - Autor do documento
- `{{ doc.version }}` - Versão do documento

### 🏢 Company (Empresa)

- `{{ company.name }}` - Nome da empresa
- `{{ company.address }}` - Endereço da empresa
- `{{ company.phone }}` - Telefone da empresa

## 🔧 Personalização

### Adicionar Variáveis Customizadas

```typescript
import { useVariables } from "next-level-editor";

const { addVariable } = useVariables();

addVariable({
  id: "custom.projectName",
  name: "custom.projectName",
  label: "Project Name",
  value: "My Awesome Project",
  category: "custom",
  description: "The name of the current project",
});
```

### Atualizar Valores de Variáveis

```typescript
const { updateVariableValue } = useVariables();

updateVariableValue("user.name", "Jane Smith");
updateVariableValue("company.name", "Acme Corporation");
```

### Criar Categoria Customizada

```typescript
const variables = useVariables();

// Adicionar nova categoria
variables.categories.value.push({
  id: "custom",
  name: "Custom Variables",
  icon: "⚙️",
});

// Adicionar variáveis da nova categoria
addVariable({
  id: "custom.var1",
  name: "custom.var1",
  label: "Custom Variable 1",
  value: "Value 1",
  category: "custom",
});
```

## 🎯 Casos de Uso

### 1. Templates de Email

```html
<h2>Email para Cliente</h2>
<p>Olá,</p>
<p>Este email é de {{ user.name }} ({{ user.email }}) sobre {{ doc.title }}.</p>
<p>Data: {{ date.today }}</p>
<p>Atenciosamente,<br />{{ company.name }}</p>
```

### 2. Faturas e Documentos Financeiros

```html
<h1>Fatura</h1>
<p><strong>Empresa:</strong> {{ company.name }}</p>
<p><strong>Endereço:</strong> {{ company.address }}</p>
<p><strong>Telefone:</strong> {{ company.phone }}</p>
<hr />
<p><strong>Para:</strong> {{ user.name }}</p>
<p><strong>Data:</strong> {{ date.today }}</p>
<p><strong>Fatura #:</strong> {{ doc.version }}</p>
```

### 3. Cartas e Correspondências

```html
<p>{{ date.today }}</p>
<p>Prezado(a) destinatário(a),</p>
<p>
  Esta carta é escrita por {{ user.firstName }} {{ user.lastName }} em nome de
  {{ company.name }}.
</p>
<p>Atenciosamente,<br />{{ user.name }}</p>
```

### 4. Relatórios

```html
<h1>{{ doc.title }}</h1>
<p><strong>Data do Relatório:</strong> {{ date.today }}</p>
<p><strong>Hora de Geração:</strong> {{ date.now }}</p>
<p><strong>Ano:</strong> {{ date.year }}</p>
<p><strong>Preparado por:</strong> {{ user.name }}</p>
<p><strong>Empresa:</strong> {{ company.name }}</p>
```

## ⌨️ Atalhos de Teclado

| Atalho  | Ação                            |
| ------- | ------------------------------- |
| `{{`    | Abrir autocomplete de variáveis |
| `↑`     | Navegar para cima na lista      |
| `↓`     | Navegar para baixo na lista     |
| `Enter` | Inserir variável selecionada    |
| `Tab`   | Inserir variável selecionada    |
| `Esc`   | Fechar autocomplete             |

## 🎨 Estilização

As variáveis são renderizadas com a classe CSS `.editor-variable`:

```css
.editor-variable {
  display: inline-flex;
  padding: 2px 8px;
  background: #e8f2ff;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  color: #1e40af;
  font-family: "Courier New", monospace;
  font-weight: 600;
}
```

### Personalizar Estilo das Variáveis

```css
/* Sobrescrever estilos */
.nle-content .editor-variable {
  background: #your-color;
  border-color: #your-border-color;
  color: #your-text-color;
}

/* Estado hover */
.nle-content .editor-variable:hover {
  background: #your-hover-color;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* Tema escuro */
.nle-container.dark .editor-variable {
  background: rgba(59, 130, 246, 0.15);
  border-color: #60a5fa;
  color: #93c5fd;
}
```

## 🔍 API Completa

### Composable: `useVariables()`

```typescript
interface Variable {
  id: string
  name: string
  label: string
  value: string
  category?: string
  description?: string
}

interface VariableCategory {
  id: string
  name: string
  icon?: string
}

const {
  // Estado reativo
  variables: ComputedRef<Variable[]>
  categories: ComputedRef<VariableCategory[]>

  // Métodos
  getVariablesByCategory: (categoryId: string) => Variable[]
  getVariable: (name: string) => Variable | undefined
  addVariable: (variable: Variable) => void
  updateVariableValue: (name: string, value: string) => void
  removeVariable: (name: string) => void
  searchVariables: (query: string) => Variable[]
  parseVariables: (text: string) => RegExpMatchArray[]
  replaceVariables: (text: string) => string
  wrapVariablesInContent: (editor: HTMLElement | null) => void
  insertVariable: (editor: HTMLElement | null, variableName: string) => void
  detectVariableAtCursor: (editor: HTMLElement | null) => { isInVariable: boolean, variableName: string, query: string } | null
} = useVariables()
```

## 📱 Responsividade

O sistema de variáveis é totalmente responsivo:

- **Desktop**: Autocomplete completo com todas as informações
- **Tablet**: Layout adaptado mantendo funcionalidade
- **Mobile**: Pills menores, autocomplete otimizado para toque

## 🌐 Acessibilidade

- **Navegação por teclado**: Suporte completo
- **Screen readers**: Atributos ARIA apropriados
- **Alto contraste**: Cores ajustadas automaticamente
- **Reduced motion**: Animações respeitam preferências do usuário
- **Focus indicators**: Indicadores visuais claros

## 🖨️ Impressão

Ao imprimir, as variáveis são automaticamente substituídas por seus valores:

```css
@media print {
  .editor-variable {
    font-size: 0; /* Esconde {{ variableName }} */
  }

  .editor-variable::after {
    content: attr(data-value); /* Mostra o valor */
    font-size: 12pt;
  }
}
```

## 🧪 Testes

Execute os testes do sistema de variáveis:

```bash
npm test -- src/composables/__tests__/useVariables.spec.ts
```

## 📊 Performance

- **Lazy loading**: Variáveis só são processadas quando ativadas
- **Debouncing**: Autocomplete com debounce para melhor performance
- **Tree walking otimizado**: Processamento eficiente de variáveis no DOM
- **Bundle impact**: +~3KB gzipped quando ativado

## 🔄 Integração com Outros Recursos

### Com Writing Assistant

```vue
<NextLevelEditor
  v-model="content"
  :enable-variables="true"
  :show-writing-stats="true"
/>
```

### Com Comments System

```vue
<NextLevelEditor
  v-model="content"
  :enable-variables="true"
  :enable-comments="true"
/>
```

## 📝 Exemplos Completos

Veja os exemplos completos em:

- `docs/demos/variables-demo.html` - Demonstração standalone
- `src/demo/examples/variablesExample.ts` - Exemplos programáticos

## 🐛 Troubleshooting

### Autocomplete não aparece

- Verifique se `:enable-variables="true"` está definido
- Certifique-se de estar digitando `{{` (duas chaves abertas)

### Variáveis não são substituídas ao imprimir

- Verifique se o CSS de variáveis está importado
- Confirme que o atributo `data-value` está presente

### Estilo não aparece

- Importe o CSS: `import 'next-level-editor/dist/next-level-editor.css'`
- Verifique conflitos com CSS global

## 🎯 Roadmap

- [ ] Variáveis com formatação (ex: `{{ date.today | format('DD/MM/YYYY') }}`)
- [ ] Variáveis condicionais (ex: `{{ if user.premium }}`)
- [ ] Variáveis de loop (ex: `{{ for item in items }}`)
- [ ] Import/Export de variáveis
- [ ] Variáveis aninhadas (ex: `{{ user.address.city }}`)
- [ ] Validação de variáveis
- [ ] Preview de valores no autocomplete

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, veja o guia de contribuição principal do projeto.

## 📄 Licença

MIT License - veja LICENSE para mais detalhes.

---

<!-- markdownlint-disable MD036 -->

**Desenvolvido com ❤️ para Next Level Editor**

<!-- markdownlint-enable MD036 -->
