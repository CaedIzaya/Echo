export interface GentleReminderMessage {
  title: string;
  body: string;
}

export const GOAL_REACHED_MESSAGES: GentleReminderMessage[] = [
  { title: 'Lumi 轻轻戳你一下', body: '这轮最低约定已经完成啦。要继续待一会儿，还是先收下今天这一小步？' },
  { title: '这一轮已经够好了', body: '你刚刚那段专注已经达标。继续也很好，停在这里也算数。' },
  { title: '小结界已稳稳落地', body: '最低目标完成。现在继续往前，或者就把这一小步装进口袋里。' },
];

export const AWAY_TOO_LONG_MESSAGES: GentleReminderMessage[] = [
  { title: '你刚刚那轮还亮着', body: 'Lumi 还在这边守着。要不要回来，把它轻轻接上？' },
  { title: '结界还没散', body: '这轮专注还在继续。你想的话，现在回来也来得及。' },
  { title: '小火苗还留着', body: '你刚刚打开的这段时间，还没有丢。要不要回来续一下？' },
];

export function pickRandomMessage(messages: GentleReminderMessage[]): GentleReminderMessage {
  return messages[Math.floor(Math.random() * messages.length)]!;
}
