export const SONGSHAN_SEED_TASKS = [
  {
    order_index: 1,
    title: "任務 01・找到一隻兔子",
    prompt_md: "機場裡有一隻兔子。找到它，拍下來。\n（它不會是一隻真的兔子）",
    hint: "形狀、影子、耳朵、姿勢，都算數。",
  },
  {
    order_index: 2,
    title: "任務 02・放炸彈的位置",
    prompt_md: "如果你要在機場藏一顆炸彈，你會放哪裡？拍下那個位置。",
    hint: "這題其實在問：哪裡是沒有人會看的地方？",
  },
  {
    order_index: 3,
    title: "任務 03・最不像機場的角落",
    prompt_md: "找到一個你覺得完全不像機場的地方。",
    hint: "把它拍得更不像機場。",
  },
  {
    order_index: 4,
    title: "任務 04・有人留下的痕跡",
    prompt_md: "找到一個「有人來過」的證據，但那個人已經不在了。",
    hint: "磨損、殘膠、手印、被移動過的東西。",
  },
  {
    order_index: 5,
    title: "任務 05・機場裡最慢的東西",
    prompt_md: "這裡所有東西都在移動。找到最慢的那一個。",
    hint: null,
  },
  {
    order_index: 6,
    title: "任務 06・幫這個地方取一個新名字",
    prompt_md: "選一個角落，幫它取一個新名字，拍下來並寫上那個名字。",
    hint: "名字要像是這個地方本來就叫這個。",
  },
] as const;

export const SONGSHAN_SEED_TEAMS = [
  { name: "第 1 組", code: "A3K9" },
  { name: "第 2 組", code: "B7M2" },
  { name: "第 3 組", code: "C4P8" },
  { name: "第 4 組", code: "D1Q6" },
  { name: "第 5 組", code: "E5R3" },
  { name: "第 6 組", code: "F8T1" },
] as const;
