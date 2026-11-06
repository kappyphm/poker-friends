const RANKS: { name: string; example: string; desc: string }[] = [
  { name: 'Royal Flush — Thùng phá sảnh lớn', example: 'A♠ K♠ Q♠ J♠ 10♠', desc: 'Năm lá đồng chất từ 10 tới Át. Bài mạnh nhất, không thể bị đánh bại.' },
  { name: 'Straight Flush — Thùng phá sảnh', example: '9♥ 8♥ 7♥ 6♥ 5♥', desc: 'Năm lá liên tiếp và đồng chất.' },
  { name: 'Four of a Kind — Tứ quý', example: 'K♠ K♥ K♦ K♣ 3♠', desc: 'Bốn lá cùng hạng và một lá lẻ (kicker).' },
  { name: 'Full House — Cù lũ', example: 'Q♠ Q♥ Q♦ 8♣ 8♠', desc: 'Một bộ ba cộng một đôi. So bộ ba trước, rồi tới đôi.' },
  { name: 'Flush — Thùng', example: 'A♦ J♦ 8♦ 5♦ 3♦', desc: 'Năm lá đồng chất nhưng không liên tiếp. So lá cao nhất trước.' },
  { name: 'Straight — Sảnh', example: '10♣ 9♠ 8♦ 7♥ 6♣', desc: 'Năm lá liên tiếp, khác chất. Át có thể làm sảnh cao nhất (10-J-Q-K-A) hoặc thấp nhất (A-2-3-4-5, khi đó lá cao là 5).' },
  { name: 'Three of a Kind — Bộ ba (sám)', example: '7♠ 7♥ 7♦ K♣ 2♠', desc: 'Ba lá cùng hạng và hai lá lẻ.' },
  { name: 'Two Pair — Hai đôi', example: 'J♠ J♥ 4♦ 4♣ A♠', desc: 'Hai đôi và một lá lẻ. So đôi cao, đôi thấp, rồi lá lẻ.' },
  { name: 'Pair — Một đôi', example: '10♠ 10♥ A♦ 6♣ 3♠', desc: 'Một đôi và ba lá lẻ xếp giảm dần để so kicker.' },
  { name: 'High Card — Bài cao', example: 'A♠ J♦ 8♣ 5♥ 3♦', desc: 'Không có liên kết nào, so lá cao nhất rồi các lá tiếp theo.' },
];

export default function GuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      <section>
        <h1 className="text-3xl font-bold mb-3">Hướng dẫn chơi Texas Hold'em</h1>
        <p className="text-neutral-300 leading-relaxed">
          Mỗi người chơi nhận 2 lá bài tẩy úp, và 5 lá bài chung lần lượt được mở ở giữa bàn.
          Nhiệm vụ là tạo tay bài 5 lá mạnh nhất từ 7 lá (2 lá tẩy + 5 lá chung), hoặc khiến mọi đối thủ úp bỏ trước khi lật bài.
          Bàn chơi cần tối thiểu 3 người và tối đa 10 người.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Diễn biến một ván</h2>
        <ol className="list-decimal list-inside space-y-2 text-neutral-300 leading-relaxed">
          <li><b>Blind:</b> người ngồi sau nút Dealer đặt Small Blind, người tiếp theo đặt Big Blind. Blind cố định suốt buổi chơi.</li>
          <li><b>Pre-flop:</b> mỗi người được chia 2 lá tẩy. Vòng cược bắt đầu từ người sau Big Blind; có thể úp bỏ (fold), theo (call) hoặc tố (raise).</li>
          <li><b>Flop:</b> mở 3 lá chung, cược tiếp bắt đầu từ người chơi đầu tiên còn trong ván ở bên trái Dealer.</li>
          <li><b>Turn:</b> mở lá chung thứ tư, cược thêm một vòng.</li>
          <li><b>River:</b> mở lá chung thứ năm, cược vòng cuối.</li>
          <li><b>Showdown:</b> ai còn lại sau River thì lật bài, tay bài mạnh nhất thắng pot. Nếu nhiều người all-in với số chip khác nhau, pot được chia thành pot chính và các pot phụ (side pot) — mỗi pot chỉ dành cho những người đã góp đủ chip vào pot đó. Hòa thì chia đều pot, chip lẻ thuộc về người ở vị trí sớm nhất tính từ bên trái Dealer.</li>
        </ol>
        <p className="text-neutral-300 mt-3 leading-relaxed">
          Các hành động: <b>Fold</b> úp bỏ và mất số chip đã cược; <b>Check</b> bỏ qua khi không cần theo thêm;
          <b> Call</b> theo bằng mức cược cao nhất hiện tại; <b>Raise</b> nâng mức cược (mức nâng tối thiểu bằng mức nâng trước đó, hoặc bằng Big Blind nếu chưa ai nâng);
          <b> All-in</b> cược toàn bộ chip còn lại. Mỗi lượt có 30 giây — hết giờ hệ thống tự check nếu được, không thì tự úp bỏ.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Thứ hạng bài (từ mạnh nhất)</h2>
        <div className="space-y-2">
          {RANKS.map((r, i) => (
            <div key={r.name} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-neutral-500 font-mono">{i + 1}.</span>
                <span className="font-semibold">{r.name}</span>
                <span className="text-emerald-300 tracking-wider">{r.example}</span>
              </div>
              <p className="text-sm text-neutral-400 mt-1">{r.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-neutral-400 text-sm mt-3">
          Khi hai tay bài cùng hạng, so sánh theo các lá quyết định (kicker) từ cao xuống thấp; vẫn bằng nhau thì chia pot.
          Người thua ở showdown được quyền giấu bài (muck), trừ trường hợp có all-in thì mọi bài đều được lật.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Buy-in và chip</h2>
        <p className="text-neutral-300 leading-relaxed">
          Game chơi vui giữa bạn bè, không dùng tiền thật và không có số dư tài khoản.
          Mỗi lần vào bàn, bạn nhập số chip muốn mang vào — số chip phải đạt mức tối thiểu do chủ bàn đặt.
          Muốn mua thêm chip (rebuy) thì thực hiện giữa hai ván, hoặc bất cứ lúc nào nếu đã hết chip; không mua thêm giữa ván đang đánh.
          Khi rời bàn, buổi chơi kết thúc: tổng chip đã mua, số lần mua thêm, chip còn lại và kết quả lãi/lỗ đều được ghi vào trang Lịch sử để tra cứu.
        </p>
      </section>
    </div>
  );
}
