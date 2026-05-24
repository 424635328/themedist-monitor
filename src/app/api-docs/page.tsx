import { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import CopyAllButton from '@/components/copy-all-button';

export const metadata: Metadata = {
  title: 'API 接口文档 — ThemeDist Monitor',
  description: 'ThemeDist Monitor 完整、公开的 API 接口参考文档',
};

interface TocItem {
  id: string;
  text: string;
  level: number;
}

// 块级 Markdown 结构解析器
function parseMarkdownToHtml(markdown: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const normalized = markdown.replace(/\r\n/g, '\n');
  
  // 按照连续换行将文本拆分为块，同时妥善保留代码块结构
  const blocks: string[] = [];
  let currentBlock = '';
  let inCodeBlock = false;
  
  const lines = normalized.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      currentBlock += line + '\n';
      if (!inCodeBlock) {
        blocks.push(currentBlock.trim());
        currentBlock = '';
      }
      continue;
    }
    
    if (inCodeBlock) {
      currentBlock += line + '\n';
    } else {
      if (line.trim() === '') {
        if (currentBlock.trim() !== '') {
          blocks.push(currentBlock.trim());
          currentBlock = '';
        }
      } else {
        currentBlock += line + '\n';
      }
    }
  }
  if (currentBlock.trim() !== '') {
    blocks.push(currentBlock.trim());
  }

  // 行内元素渲染（加粗、行内代码、图片、超链接）
  const renderInline = (text: string): string => {
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // 1. 加粗
    escaped = escaped.replace(/\*\*([\s\S]+?)\*\*/g, '<strong class="font-semibold text-zinc-100">$1</strong>');
    
    // 2. 行内代码
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded text-xs font-mono bg-zinc-800/60 border border-zinc-700/50 text-indigo-300 font-medium">$1</code>');
    
    // 3. 图片 (必须在超链接之前解析，防止图片语法中的 [text](url) 被误判为超链接)
    escaped = escaped.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="inline-block align-middle my-1 mr-2 hover:opacity-90 transition-opacity" />');
    
    // 4. 超链接
    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-4 decoration-zinc-800 hover:decoration-indigo-400">$1</a>');
    
    return escaped;
  };

  const htmlBlocks: string[] = [];

  for (const block of blocks) {
    // 1. 代码块 (Fenced Code Block)
    if (block.startsWith('```')) {
      const match = block.match(/^```(\w*)\n([\s\S]*)\n```$/);
      const lang = match ? match[1] : '';
      const code = match ? match[2] : block.replace(/^```\w*\n|```$/g, '');
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      htmlBlocks.push(`
        <div class="relative group my-5 rounded-xl border border-zinc-800/80 bg-zinc-950 overflow-hidden font-mono text-xs leading-relaxed">
          <div class="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800/80 text-zinc-500 text-[10px] font-sans tracking-wider uppercase select-none">
            <span>${lang || 'code'}</span>
          </div>
          <pre class="p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800"><code class="text-zinc-300 block">${escapedCode}</code></pre>
        </div>
      `);
      continue;
    }

    // 2. 标题 (Headings)
    if (block.startsWith('#')) {
      const match = block.match(/^(#{1,4})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawText = match[2].trim();
        const inlineText = renderInline(rawText);
        
        // 自动生成符合 URL 锚点规则的 id
        const id = rawText
          .toLowerCase()
          .replace(/[^\w\s-\u4e00-\u9fa5]/g, '')
          .replace(/\s+/g, '-');

        // 将 H2 和 H3 加入目录列表
        if (level === 2 || level === 3) {
          toc.push({ id, text: rawText, level });
        }

        // 针对 API 路由标题（例如 ### GET /api/status）的专用徽章渲染
        const apiHeaderMatch = rawText.match(/^(GET|POST|DELETE|PUT|PATCH)\s+(.+)$/);
        if (level === 3 && apiHeaderMatch) {
          const method = apiHeaderMatch[1];
          const pathStr = apiHeaderMatch[2];
          const badgeColors: Record<string, string> = {
            GET: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            POST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            DELETE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          };
          const colorClass = badgeColors[method] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

          htmlBlocks.push(`
            <h3 id="${id}" class="group flex items-center gap-3 pt-8 pb-2 border-b border-zinc-800/60 text-sm font-semibold text-zinc-200 scroll-m-20">
              <span class="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded border ${colorClass}">${method}</span>
              <span class="font-mono text-zinc-100 select-all">${pathStr}</span>
              <a href="#${id}" class="opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 text-zinc-600 hover:text-zinc-400" aria-label="Link to section">#</a>
            </h3>
          `);
        } else {
          const sizeClasses = {
            1: 'text-2xl font-bold text-zinc-50 tracking-tight pb-3 border-b border-zinc-800 mb-6',
            2: 'text-base font-semibold text-zinc-100 tracking-tight mt-12 mb-4 pb-2 border-b border-zinc-800/80 scroll-m-20',
            3: 'text-sm font-semibold text-zinc-200 mt-8 mb-3 scroll-m-20',
            4: 'text-xs font-semibold text-zinc-400 mt-6 mb-2',
          }[level as 1|2|3|4] || 'text-sm';

          htmlBlocks.push(`<h${level} id="${id}" class="${sizeClasses} group">${inlineText}<a href="#${id}" class="opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 text-zinc-600 hover:text-zinc-400" aria-label="Link to section">#</a></h${level}>`);
        }
        continue;
      }
    }

    // 3. 分割线 (Horizontal Rule)
    if (block === '---') {
      htmlBlocks.push('<hr class="my-8 border-t border-zinc-800/80" />');
      continue;
    }

    // 4. 表格 (Tables)
    if (block.startsWith('|')) {
      const rows = block.split('\n');
      if (rows.length >= 2) {
        const headerRow = rows[0];
        const bodyRows = rows.slice(2);

        const parseCells = (rowStr: string) => {
          return rowStr
            .split('|')
            .map(c => c.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        };

        const headers = parseCells(headerRow);
        const headerHtml = `
          <thead>
            <tr class="border-b border-zinc-800 bg-zinc-900/30">
              ${headers.map(h => `<th class="px-4 py-2 text-left text-[11px] font-medium text-zinc-400 tracking-wider">${renderInline(h)}</th>`).join('')}
            </tr>
          </thead>
        `;

        const bodyHtml = `
          <tbody class="divide-y divide-zinc-800/40">
            ${bodyRows.map(row => {
              const cells = parseCells(row);
              if (cells.length === 0) return '';
              return `
                <tr class="hover:bg-zinc-900/10 transition-colors">
                  ${cells.map(c => `<td class="px-4 py-2.5 text-xs text-zinc-400 align-top">${renderInline(c)}</td>`).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        `;

        htmlBlocks.push(`
          <div class="my-4 overflow-x-auto rounded-lg border border-zinc-800/60 bg-zinc-950/20">
            <table class="min-w-full divide-y divide-zinc-800/60">
              ${headerHtml}
              ${bodyHtml}
            </table>
          </div>
        `);
        continue;
      }
    }

    // 5. 无序列表 (Unordered Lists)
    if (block.startsWith('- ')) {
      const listItems = block.split('\n');
      const itemsHtml = listItems
        .map(li => {
          const content = li.replace(/^-\s+/, '');
          return `<li class="relative pl-5 py-0.5 text-xs text-zinc-400 leading-relaxed before:absolute before:left-1.5 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-zinc-700">${renderInline(content)}</li>`;
        })
        .join('');
      htmlBlocks.push(`<ul class="my-4 space-y-2">${itemsHtml}</ul>`);
      continue;
    }

    // 6. 段落 (Paragraphs - Fallback)
    const inlinePara = renderInline(block.trim().replace(/\n/g, '<br />'));
    htmlBlocks.push(`<p class="my-3 text-xs text-zinc-400 leading-relaxed">${inlinePara}</p>`);
  }

  return { html: htmlBlocks.join('\n'), toc };
}

export default function ApiDocsPage() {
  const mdPath = path.join(process.cwd(), 'DOCS', 'API.md');
  let content = '# API 接口文档\n\n未找到文档内容。';
  
  try {
    content = fs.readFileSync(mdPath, 'utf-8');
  } catch {
    // fallback
  }

  const { html, toc } = parseMarkdownToHtml(content);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* 工具栏：右对齐的复制按钮 */}
        <div className="flex justify-end mb-6">
          <CopyAllButton text={content} />
        </div>

        {/* 顶部 Base URL 信息卡片 */}
        <div className="mb-10 p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">服务基础地址 (Base URL)</h2>
              <p className="text-xs text-zinc-500 mt-1">全局统一的监控接口入口，所有接口均允许跨域请求且免鉴权。</p>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-800 select-all font-mono text-xs text-indigo-400">
              <span>https://themedist-monitor.vercel.app</span>
            </div>
          </div>
        </div>

        {/* 双栏布局 */}
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* 目录侧边栏 (桌面端粘性悬浮) */}
          <aside className="w-full lg:w-64 shrink-0 order-first lg:order-last">
            <div className="lg:sticky lg:top-8 p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/10">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4 select-none">
                目录导航
              </h3>
              <nav className="space-y-1 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 pr-1">
                {toc.map((item) => {
                  const paddingClass = item.level === 3 ? 'pl-6 text-[11px]' : 'pl-2 text-xs font-medium';
                  const textClass = item.level === 3 ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-200';
                  
                  // 针对 API 类型的目录子项做精细化美化
                  const displayLabel = item.text.replace(/^(GET|POST|DELETE|PUT|PATCH)\s+/, '');
                  const hasMethod = item.text.match(/^(GET|POST|DELETE|PUT|PATCH)/);
                  const methodStr = hasMethod ? hasMethod[0] : '';
                  
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`group flex items-center justify-between py-1.5 rounded-md transition-colors ${paddingClass} ${textClass}`}
                    >
                      <span className="truncate">{displayLabel}</span>
                      {methodStr && (
                        <span className="text-[9px] font-mono px-1 rounded bg-zinc-800/80 text-zinc-400 group-hover:bg-zinc-800 transition-colors uppercase">
                          {methodStr}
                        </span>
                      )}
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* 主文档展示区 */}
          <main className="flex-1 min-w-0">
            <div 
              className="prose prose-sm prose-invert max-w-none 
                [&_p]:text-xs [&_p]:text-zinc-400 [&_p]:leading-relaxed [&_p]:my-4
                [&_ul]:my-4 [&_ul]:list-none [&_ul]:pl-0
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-5
                [&_th]:text-zinc-300 [&_th]:font-semibold [&_th]:border-b [&_th]:border-zinc-800
                [&_td]:text-zinc-400 [&_td]:border-b [&_td]:border-zinc-900
              "
              dangerouslySetInnerHTML={{ __html: html }} 
            />
          </main>

        </div>
      </div>
    </div>
  );
}