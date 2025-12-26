const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const linkifyMentions = (
  content: string,
  roles: { id: string; name: string }[],
  clues: { id: string; title: string }[]
) => {
  let output = content;

  for (const role of roles) {
    if (!role.name) continue;
    const pattern = new RegExp(`@${escapeRegex(role.name)}`, "g");
    output = output.replace(pattern, `[@${role.name}](#role-${role.id})`);
  }

  for (const clue of clues) {
    if (!clue.title) continue;
    const pattern = new RegExp(`#${escapeRegex(clue.title)}`, "g");
    output = output.replace(pattern, `[#${clue.title}](#clue-${clue.id})`);
  }

  return output;
};
