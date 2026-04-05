# Catena Áurea — Santo Tomás de Aquino

> *Exposição Contínua sobre os Santos Evangelhos*

Aplicação web de leitura e estudo dos quatro Evangelhos com os comentários patrísticos compilados por Santo Tomás de Aquino na **Catena Áurea** (séc. XIII). O texto de cada versículo é acompanhado de comentários dos maiores Padres da Igreja, organizados por Santo Tomás numa "corrente de ouro" de sabedoria patrística.

---

## Demonstração

🔗 **[catena-aurea.github.io](https://guilherme-evangelista.github.io/catena-aurea)**
*(substitua com o seu link após publicar)*

---

## Funcionalidades

- 📖 Texto completo dos quatro Evangelhos (3.776 versículos)
- ✝ 815 blocos de comentários patrísticos extraídos da Catena Áurea
- 🎨 Tema visual por Evangelho, inspirado nas capas da edição Ecclesiae
- 🦁 Ícones vectorizados dos quatro viventes (Anjo, Leão, Touro, Águia)
- 🔍 Navegação por capítulo com indicação de versículos comentados
- ↔ Painel lateral de comentários redimensionável por arrasto
- ⚡ Carregamento lazy — cada Evangelho é carregado sob demanda
- 📱 Responsivo (mobile/tablet/desktop)
- 🌐 Funciona offline após o primeiro carregamento

---

## Conteúdo

| Evangelho   | Capítulos | Versículos | Blocos de comentário |
|-------------|:---------:|:----------:|:--------------------:|
| São Mateus  | 28        | 1.070      | 278                  |
| São Marcos  | 16        | 677        | 104                  |
| São Lucas   | 24        | 1.151      | 245                  |
| São João    | 21        | 878        | 188                  |
| **Total**   | **89**    | **3.776**  | **815**              |

---

## Estrutura do projeto

```
catena-aurea/
│
├── index.html                  ← Estrutura HTML semântica
│
├── assets/
│   ├── css/
│   │   └── style.css           ← Estilos (custom properties, layout, animações)
│   │
│   ├── js/
│   │   ├── symbols.js          ← SVGs dos quatro evangelistas
│   │   ├── themes.js           ← Paletas de cor por Evangelho + metadados
│   │   ├── commentary.js       ← Parser/formatter do texto patrístico
│   │   └── app.js              ← Controlador principal (navegação, renderização)
│   │
│   └── images/
│       ├── cover-mateus.jpg    ← Capa Vol. I (São Mateus)
│       ├── cover-marcos.jpg    ← Capa Vol. II (São Marcos)
│       ├── cover-lucas.jpg     ← Capa Vol. III (São Lucas)
│       └── cover-joao.jpg      ← Capa Vol. IV (São João)
│
├── data/
│   ├── mateus.js             ← Evangelho + comentários (~2,3 MB)
│   ├── marcos.js             ← Evangelho + comentários (~0,8 MB)
│   ├── lucas.js              ← Evangelho + comentários (~1,9 MB)
│   └── joao.js               ← Evangelho + comentários (~1,5 MB)
│
└── README.md
```

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Marcação | HTML5 semântico |
| Estilos | CSS puro (custom properties, grid, `color-mix`) |
| Scripts | JavaScript vanilla (ES2022, sem frameworks) |
| Fontes | Google Fonts — Cinzel, Lora, Inter |
| Dados | JS estático, carregado via `fetch()` |
| Hospedagem | GitHub Pages (estático, gratuito) |

Sem dependências de terceiros. Sem bundler. Sem build step.

---

## Créditos

- **Texto da Catena Áurea:** tradução para o português baseada na edição inglesa clássica de Oxford (1841–1845), revisada pela edição brasileira **Ecclesiae**
- **Compilação original:** Santo Tomás de Aquino (1225–1274)
- **Fontes tipográficas:** Cinzel, Lora e Inter via [Google Fonts](https://fonts.google.com)
- **Implementação digital:** gerada com auxílio do [Claude](https://claude.ai) (Anthropic)

---

*"É impossível ler a Catena de S. Tomás sem ficar impressionado com a maestria e a habilidade arquitetônica com que é elaborada."*
— Prefácio da edição de Oxford, 1841
