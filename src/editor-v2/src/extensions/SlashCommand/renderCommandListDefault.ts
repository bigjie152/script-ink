import type { CommandList } from './types';

export function renderCommandListDefault({ t }: any) {
  const groups: CommandList[] = [
    {
      name: "basic",
      title: "基础",
      commands: [
        {
          name: "text",
          label: "文本",
          description: "普通段落，用于正文",
          aliases: ["p", "paragraph", "wenben"],
          iconName: "Type",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setParagraph().run();
          },
        },
      ],
    },
    {
      name: "heading",
      title: "标题",
      commands: [
        {
          name: "heading1",
          label: "标题 1",
          description: "适合章节标题",
          aliases: ["h1", "bt1"],
          iconName: "Heading1",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
          },
        },
        {
          name: "heading2",
          label: "标题 2",
          description: "适合小节标题",
          aliases: ["h2", "bt2"],
          iconName: "Heading2",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
          },
        },
        {
          name: "heading3",
          label: "标题 3",
          description: "适合段落小标题",
          aliases: ["h3", "bt3"],
          iconName: "Heading3",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
          },
        },
      ],
    },
    {
      name: "list",
      title: "列表",
      commands: [
        {
          name: "bulletList",
          label: t("editor.bulletlist.tooltip"),
          description: "点列或清单",
          aliases: ["ul", "list"],
          iconName: "List",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
          },
        },
        {
          name: "orderedList",
          label: t("editor.orderedlist.tooltip"),
          description: "有序编号",
          aliases: ["ol", "ordered"],
          iconName: "ListOrdered",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
          },
        },
        {
          name: "taskList",
          label: t("editor.tasklist.tooltip"),
          description: "待办清单",
          aliases: ["todo", "task"],
          iconName: "ListTodo",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run();
          },
        },
      ],
    },
    {
      name: "block",
      title: "区块",
      commands: [
        {
          name: "blockquote",
          label: t("editor.blockquote.tooltip"),
          description: "引用或描述提示",
          aliases: ["quote", "yinyong"],
          iconName: "Quote",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setBlockquote().run();
          },
        },
        {
          name: "callout",
          label: "提示块",
          description: "强调重要信息",
          aliases: ["callout", "tip"],
          iconName: "Sparkles",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleCallout().run();
          },
        },
        {
          name: "horizontalRule",
          label: t("editor.horizontalrule.tooltip"),
          description: "分隔内容",
          aliases: ["hr", "divider"],
          iconName: "Minus",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
          },
        },
        {
          name: "codeBlock",
          label: t("editor.codeblock.tooltip"),
          description: "展示结构化内容",
          aliases: ["code", "codeblock"],
          iconName: "Code2",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setCodeBlock().run();
          },
        },
      ],
    },
    {
      name: "mention",
      title: "引用",
      commands: [
        {
          name: "mentionRole",
          label: "插入角色引用",
          description: "链接到角色",
          aliases: ["role", "@角色"],
          iconName: "BookMarked",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent("@").run();
          },
        },
        {
          name: "mentionClue",
          label: "插入线索引用",
          description: "链接到线索",
          aliases: ["clue", "#线索"],
          iconName: "Sparkles",
          action: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent("#").run();
          },
        },
      ],
    },
  ];

  return groups;
}

export function useFilterCommandList(commandList: CommandList[], query: string) {
  const normalizedQuery = query.toLowerCase().trim();

  const fuzzyMatch = (text: string) => {
    const compact = text.toLowerCase().replace(/\s+/g, "");
    const needle = normalizedQuery.replace(/\s+/g, "");
    if (!needle) return true;
    if (compact.includes(needle)) return true;
    let cursor = 0;
    for (const char of needle) {
      const idx = compact.indexOf(char, cursor);
      if (idx === -1) return false;
      cursor = idx + 1;
    }
    return true;
  };

  const withFilteredCommands = commandList.map((group) => ({
    ...group,
    commands: group.commands.filter((item) => {
      if (!normalizedQuery) return true;
      const labelMatch = fuzzyMatch(item.label);
      const aliasMatch = item.aliases?.some((alias) => fuzzyMatch(alias)) ?? false;
      return labelMatch || aliasMatch;
    }),
  }));
  // Remove empty groups
  const withoutEmptyGroups = withFilteredCommands.filter((group) => {
    if (group.commands.length > 0) {
      return true;
    }

    return false;
  });

  return withoutEmptyGroups;
}

