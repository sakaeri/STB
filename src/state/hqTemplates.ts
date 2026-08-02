// Industry starter templates offered at HQ setup — picking one just
// prefills the unit label (呼称) and seeds a handful of 情報メモ topics
// relevant to that kind of organization; everything stays fully editable
// afterward. FREE_TEMPLATE_ID means "no template" (今まで通り自由に作成).
export interface HqTemplate {
  id: string;
  label: string;
  unitLabel: string;
  teamNamePlaceholder: string;
  memoTopics: string[];
}

export const FREE_TEMPLATE_ID = 'free';

export const HQ_TEMPLATES: HqTemplate[] = [
  { id: 'company', label: '会社', unitLabel: '部署', teamNamePlaceholder: '例：営業部', memoTopics: ['就業規則', '備品管理', '契約書類'] },
  { id: 'realestate', label: '不動産', unitLabel: '物件', teamNamePlaceholder: '例：〇〇マンション', memoTopics: ['契約情報', '修繕履歴', '入居者情報'] },
  { id: 'fc', label: '多店舗・FC', unitLabel: '店舗', teamNamePlaceholder: '例：渋谷店', memoTopics: ['設備・什器', 'スタッフ情報', '契約書類'] },
  { id: 'sports', label: 'スポーツチーム', unitLabel: 'チーム', teamNamePlaceholder: '例：U12チーム', memoTopics: ['選手名簿', '用具管理', '大会日程'] },
  { id: 'community', label: '自治体・町内会', unitLabel: '班', teamNamePlaceholder: '例：1班', memoTopics: ['会員名簿', '行事予定', '会費徴収ルール'] },
  { id: 'pta', label: '学校PTA', unitLabel: '委員会', teamNamePlaceholder: '例：広報委員会', memoTopics: ['委員名簿', '年間行事予定', '引継ぎ資料'] },
  { id: 'event', label: 'イベント運営', unitLabel: '班', teamNamePlaceholder: '例：受付班', memoTopics: ['当日タイムスケジュール', '役割分担', '緊急連絡先'] },
];
