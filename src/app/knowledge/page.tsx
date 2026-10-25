import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { articles } from "../../features/knowledge/articles";
import { siteOrigin } from "../../lib/site";
export const metadata: Metadata = {
  title: "Kiến thức",
  description: "Đọc tiếng Anh trong ngữ cảnh, hiểu cách dùng và lưu từ để ôn lại.",
  ...(siteOrigin() ? { alternates: { canonical: siteOrigin() + "/knowledge" } } : {}),
};
export default function Knowledge() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">HIỂU TỪ GỐC, NHỚ TRONG CÂU</p>
          <h1 tabIndex={-1}>
            Đọc để hiểu thêm<span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">Một đoạn ngắn. Vài từ mới. Thêm một chút tự tin.</p>
        </div>
        <Badge variant="secondary">TIẾNG ANH · GIẢI THÍCH TIẾNG VIỆT</Badge>
      </div>
      <div className="knowledge-grid">
        {articles
          .filter((a) => a.published)
          .map((a) => (
            <Card key={a.slug} className="overflow-hidden rounded-[20px] border-border shadow-none">
              <CardHeader className="gap-3 bg-secondary p-7">
                <span className="eyebrow">ĐỌC TRONG NGỮ CẢNH · {a.minutes} PHÚT</span>
                <CardTitle className="font-serif text-3xl leading-tight">{a.title}</CardTitle>
                <CardDescription>{a.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-7">
                <span className="text-sm text-muted-foreground">{a.itemIds.length} từ & cụm có thể tra</span>
                <Button asChild className="min-h-11">
                  <Link href={`/knowledge/${a.slug}`}>Đọc bài →</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        <aside className="panel self-start">
          <p className="eyebrow">MỘT CÁCH HỌC NHẸ NHÀNG</p>
          <h2 className="mt-4">Để từ mới có ngữ cảnh.</h2>
          <p className="mt-4 text-muted-foreground">
            Đọc trọn ý trước. Bấm từ được gạch chân để tra, lưu những từ bạn cần rồi luyện nhớ lại.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Bài kiến thức này là nội dung tự biên soạn trong bản thử nghiệm. Các chủ đề tiếp theo sẽ được bổ sung sau
            khi dùng thử luồng đầu tiên.
          </p>
        </aside>
      </div>
    </div>
  );
}
