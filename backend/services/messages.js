// Random, playful wording. Placeholders: {by} {who} {list} {from} {to} {due} {people} {n}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

const M = {
  created: {
    titles: ['🆕 Có kèo mới!', '📌 Task vừa lọt sàn', '🎣 Mới câu được task', '✨ Task mới ra lò', '📬 Ting ting! Task mới'],
    descs: [
      '**{by}** vừa quăng task này vào **{list}**. Ai nhanh tay thì nhận!',
      'Nóng hổi vừa thổi vừa tạo bởi **{by}** ở **{list}**.',
      '**{by}** lại đẻ thêm việc cho **{list}** rồi 😏',
      'Task mới tinh ở **{list}**, người tạo: **{by}**. Đừng để nó nguội nhé!',
    ],
  },
  assigned: {
    titles: ['🎯 Trúng thưởng rồi!', '👤 Có người nhận việc', '🫵 Chọn trúng bạn rồi', '📦 Việc đã có chủ', '🏷️ Gán task thành công'],
    descs: [
      '**{who}** vừa bị **{by}** điểm danh. Chúc may mắn! 🍀',
      '**{by}** giao task này cho **{who}**. Không thoát được đâu 😎',
      'Chúc mừng **{who}**, bạn là người được chọn bởi **{by}**!',
      '**{who}** nhận kèo từ **{by}**. Xắn tay áo lên nào 💪',
    ],
  },
  review: {
    titles: ['🔍 Ai review giùm với!', '👀 Có bài chờ chấm', '📝 Đến lượt reviewer', '🧐 Soi giúp tí nào', '🕵️ Cần con mắt thứ hai'],
    descs: [
      '**{by}** đẩy task từ **{from}** sang **{to}**. Reviewer ơi, ra đây!',
      'Làm xong rồi nè, **{by}** chuyển sang **{to}**, mời các sếp soi 🔎',
      'Task vừa leo lên **{to}**. Đừng để **{by}** chờ lâu nhé!',
      '**{by}** nộp bài ở **{to}**. Nhẹ tay thôi nha 🙏',
    ],
  },
  dueChanged: {
    titles: ['📅 Dời lịch rồi!', '🗓️ Deadline đổi mặt', '⏳ Hạn chót được cập nhật', '🔄 Hạn mới đây'],
    descs: [
      '**{by}** vừa chỉnh hạn thành {due}. Ghi nhớ nha!',
      'Deadline giờ là {due} (nhờ **{by}**). Đừng quên!',
      'Lịch mới do **{by}** chốt: {due}.',
    ],
  },
  dueSoon: {
    titles: ['⏰ Sắp tới giờ G!', '🔥 Deadline đang đến gần', '🏃 Chạy nhanh lên!', '⚠️ Còn ít thời gian lắm', '🫣 Hạn sắp tới rồi đó'],
    descs: [
      'Hạn {due}. **{people}** ơi, tăng tốc thôi!',
      'Chỉ còn {due} nữa là tới hạn. Phụ trách: **{people}**.',
      'Đồng hồ đang chạy ⏱️ — hạn {due}. **{people}** lo nhé!',
      'Nhắc nhẹ: {due} là hết hạn. Người lo: **{people}**.',
    ],
  },
  overdue: {
    titles: ['🚨 Trễ hạn mất rồi!', '💀 Deadline đã đi qua', '😱 Quá hạn!', '🐢 Task đang trễ nải', '📢 Ai nhớ task này không?'],
    descs: [
      'Hạn là {due} mà vẫn chưa xong. **{people}** xử lý giúp nhé!',
      'Trễ rồi nè (hạn {due}). **{people}**, mình cùng cứu nó nào 🚑',
      'Deadline {due} đã bay màu. Người phụ trách: **{people}**.',
      'Tick tock... {due} qua lâu rồi. **{people}** để ý giúp!',
    ],
  },
  reviewDigest: {
    titles: ['🔍 {n} task đang chờ review', '📚 Chồng bài review: {n} task', '🧺 {n} task đang đợi người chấm', '👀 Còn {n} task chưa ai soi'],
  },
};

// Returns { title, description } with a random variant filled in.
function say(kind, vars = {}) {
  const m = M[kind];
  return {
    title: fill(pick(m.titles), vars),
    description: m.descs ? fill(pick(m.descs), vars) : undefined,
  };
}

module.exports = { say, pick };
