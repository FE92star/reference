import markdown from '@wcj/markdown-to-html';
import rehypeDocument from 'rehype-document';
import rehypeFormat from 'rehype-format';
import { rehypeUrls } from './nodes/rehypeUrls.mjs';
import { htmlTagAddAttri } from './nodes/htmlTagAddAttri.mjs';
import { footer } from './nodes/footer.mjs';
import { header } from './nodes/header.mjs';

/** 标记 Number */
function panelAddNumber(arr = [], result = []) {
  let n = 0;
  let level = -1;
  while (n < arr.length) {
    const toc = arr[n];
    const titleNum = Number(toc?.tagName?.replace(/^h/, ''));
    if (titleNum && titleNum > -1) {
      level = titleNum;
    }
    if (toc) {
      result.push({ ...toc, number: level })
    }
    n++;
  }
  return result
}

function getChilds(data = [], level, result = []) {
  for (let i = 1; i <= data.length; i++) {
    const titleNum = Number(data[i]?.tagName?.replace(/^h/, ''));
    if (titleNum && titleNum === level) break;
    result.push(data[i]);
  }
  return result;
}
/** 获取 Heading 到下一个 Heading 之间的内容*/
function getHeader(data = [], level, result = []) {
  for (let i = 1; i <= data.length; i++) {
    if (/^h\d$/.test(data[i]?.tagName) || data[i]?.number !== level) break;
    result.push(data[i]);
  }
  return result;
}

/** Markdown 文档转成树形结构 */
export function getTocsTree(arr = [], result = []) {
  const data = panelAddNumber(arr);
  
  let n = 0;
  let level = -1;

  while (n < data.length) {
    const toc = data[n];

    if (level === -1) {
      level = toc.number;
    }
    const titleNum = Number(toc.tagName?.replace(/^h/, ''));

    if (toc.number === level && titleNum === level) {
      const header = getHeader(data.slice(n), level);
      const warpCls = ['warp'];
      const headerCls = ['warp-header', `h${level}warp`];

      if (level === 1) warpCls.push('max-container');
      const warpStyle = toc.properties['data-warp-style'];
      delete toc.properties['data-warp-style']
      const warpClass = toc.properties['warp-class'];
      if (warpClass) warpCls.push(warpClass);
      delete toc.properties['warp-class'];
      const panle = {
        type: 'element',
        tagName: 'div',
        properties: { class: warpCls, style: warpStyle },
        children: [
          {
            type: 'element',
            tagName: level === 1 ? 'header' : 'div',
            properties: { class: headerCls },
            children: [
              toc,
              {
                type: 'element',
                tagName: 'div',
                properties: { class: 'warp-body' },
                children: [
                  ...header
                ],
              }
            ],
          }
        ],
      }
      const childs = getChilds([...data.slice(n + 1)], level);
      const resultChilds = getTocsTree(childs);
      if (resultChilds.length > 0) {
        const bodyStyle = toc.properties['data-body-style'];
        delete toc.properties['data-body-style']

        const bodyClass = toc.properties['body-class'];
        delete toc.properties['body-class']
        panle.children = panle.children.concat({
          type: 'element',
          tagName: 'div',
          properties: { class: [`h${level}warp-body`, bodyClass], style: bodyStyle },
          children: [...resultChilds]
        });
      }
      result.push(panle);
    }

    n++;
  }
  return result;
}

export function create(str = '', options = {}) {
  let title = str.match(/[^===]+(?=[===])/g);
  let description = str.match(/\n==={1,}\n+([\s\S]*?)\n/g);
  title = title[0] || '';
  description = (description[0] || '').replace(/^\n[=\n]+/, '').replace(/\[([\s\S]*?)?\]\(([\s\S]*?)?\)/g, '$1').replace(/\n/, '');
  const subTitle = options.filename && !options.isHome ? `${options.filename} cheatsheet & `: ''
  const mdOptions = {
    hastNode: false,
    remarkPlugins: [],
    rehypePlugins: [
      rehypeFormat,
      [rehypeDocument, {
        title: `${title ? `${title} & ` : ''} ${subTitle} Quick Reference`,
        css: [ ...options.css ],
        meta: [
          { description: `${description}为开发人员分享快速参考备忘单。` },
          { keywords: `Quick,Reference,cheatsheet,${!options.isHome && options.filename || ''}` }
        ]
      }],
    ],
    rewrite: (node, index, parent) => {
      htmlTagAddAttri(node, options);
      rehypeUrls(node);
      if (node.type === 'element' && node.tagName === 'body') {
        node.children = getTocsTree([ ...node.children ]);
        node.children.unshift(header(options));
        node.children.push(footer());
      }
    }
  }
  

  return markdown(str, mdOptions);
}