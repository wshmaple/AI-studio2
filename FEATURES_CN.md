# AI Studio Replica - 项目功能白皮书

**AI Studio Replica** 是一个基于 React 和 Node.js 构建的下一代 AI 开发环境。它不仅仅是一个聊天机器人，更是一个集成了 **全功能 IDE**、**可视化思维图谱** 和 **智能文档编辑器** 的 Agentic（智能体）工作台。

本项目旨在复刻并超越 Google AI Studio 的体验，为开发者提供从“对话”到“原型构建”再到“文档沉淀”的一站式解决方案。

---

## 🌟 核心功能模块

### 1. 多模态智能对话工作台 (Chat Workbench)

这是用户与 AI 交互的核心入口，支持高保真的流式对话体验。

*   **多模态输入能力**：
    *   **文本交互**：支持 Markdown 渲染、代码块高亮。
    *   **视觉理解**：支持拖拽或上传图片，AI 可针对图片内容进行分析或生成代码。
    *   **语音输入**：集成 Web Speech API，支持实时语音转文字（STT），实现无手化交互。
*   **深度思维可视化 (Thinking Process)**：
    *   针对 Gemini 2.0 Flash Thinking 模型，系统会自动解析并折叠 `<think>` 标签。
    *   用户可以展开查看 AI 的完整推理过程，或折叠以保持界面整洁。
*   **非线性对话管理**：
    *   **Retry (重试)**：不满意当前回复？一键重试，生成新的回答分支。
    *   **Edit (编辑)**：修改之前的 Prompt，从修改点开始重新生成，而不丢失旧的历史记录（通过图谱管理）。

### 2. 虚拟集成开发环境 (Project Workspace / IDE)

当 AI 生成代码时，系统会自动识别并激活右侧的 IDE 面板，提供即时预览能力。

*   **虚拟文件系统**：
    *   自动解析 AI 输出的 XML 代码块（`<file path="...">`），在内存中构建完整的文件树。
    *   支持 HTML, CSS, JavaScript, Python, JSON 等多种文件格式。
*   **双视图模式**：
    *   **Code View (代码视图)**：基于 Monaco 风格的编辑器，支持语法高亮、行号显示。
    *   **Preview View (预览视图)**：
        *   **虚拟打包器 (Virtual Bundler)**：在浏览器端动态解析 ES Modules 依赖（`import`），将虚拟文件转换为 Blob URL。
        *   **沙箱运行**：通过 iframe 安全隔离运行生成的 Web 应用，支持复杂的 DOM 操作和 CSS 样式。
*   **项目导出**：支持一键将当前虚拟文件系统打包为 `.zip` 下载到本地。

### 3. 智能体执行图谱 (Agent Execution Graph)

这是本项目的核心差异化功能，将线性的聊天记录转化为可视化的有向无环图 (DAG)。

*   **全景可视化**：
    *   清晰展示 User Prompt（用户节点）、AI Response（模型节点）、Tool Execution（工具节点）和 Generated Artifacts（文件节点）之间的流转关系。
*   **时间旅行 (Time Travel) 与 状态回滚**：
    *   点击图谱中的任意节点，可以查看当时的完整上下文数据。
    *   **Restore Context (恢复现场)**：点击“Restore Here”按钮，系统会将聊天记录 **以及** 虚拟文件系统的状态完全回滚到该节点时刻。这允许用户在不同的创意分支之间自由切换，进行“假设性”实验。

### 4. AI 辅助文档编辑器 (AI Document Editor)

一个类似 Medium/Notion 的纯净写作环境，深度集成了 AI 辅助能力。

*   **划词魔法菜单 (Magic Toolbar)**：
    *   用户选中任意文本段落，自动浮现 AI 工具栏。
    *   **Fix Grammar (语法修复)**：纠正拼写和语法错误。
    *   **Optimize (润色)**：将口语化表达转化为专业、简洁的书面语。
    *   **Expand (扩写)**：根据选中内容补充细节和深度。
    *   **Shorten (精简)**：提取摘要或精简冗余内容。
*   **流式无缝替换**：AI 的处理结果会直接流式替换选中的文本，提供原生的编辑体验。

### 5. 高级配置与设置 (Settings Panel)

*   **模型广场**：
    *   **Google Gemini**：支持 Gemini 2.5 Flash, Pro 以及 Thinking 模型。
    *   **Local LLMs (Ollama)**：支持连接本地运行的 DeepSeek R1, Llama 3 等模型，保护隐私并降低成本。
*   **参数微调**：
    *   自由调节 Temperature (创造性), Top-P, Top-K, Max Tokens。
*   **System Instructions**：
    *   自定义全局系统提示词（System Prompt），设定 AI 的角色（如“资深前端工程师”）。
*   **Google Search Grounding**：
    *   开关联网搜索能力，让 AI 回答基于最新的实时信息，并附带引用来源。

---

## 🛠️ 技术架构亮点

1.  **Node.js 后端支撑**：
    *   使用 Express 构建后端服务，不仅仅是静态页面。
    *   **安全策略**：配置了 `Cross-Origin-Opener-Policy` (COOP) 和 `Cross-Origin-Embedder-Policy` (COEP) 响应头，为未来集成 WebContainers（浏览器内运行 Node.js）做好了环境准备。
    *   **API 代理**：内置 API 代理层，解决 Ollama 等本地服务的跨域（CORS）问题。

2.  **纯前端虚拟化技术**：
    *   利用 `Blob URL` 和 `Regex` 实现了浏览器端的模块依赖解析，无需后端编译即可预览多文件前端项目。

3.  **响应式现代化 UI**：
    *   基于 Tailwind CSS 设计的 Dark Mode（深色模式）界面，完美复刻专业 IDE 的视觉风格。
    *   支持侧边栏折叠、三栏布局自适应。

---

## 🚀 快速开始

1.  **配置环境**：
    *   确保安装 Node.js v18+。
    *   在 `.env` 文件中填入您的 `API_KEY`。
2.  **启动服务**：
    *   运行 `npm install` 安装依赖。
    *   运行 `npm start` 启动服务。
3.  **访问应用**：
    *   打开浏览器访问 `http://localhost:3000`。
