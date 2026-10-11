# Chunking V3 cho RAG

## Nội dung nguồn và trích dẫn

V3 dùng source spans thay cho `MarkdownHeaderTextSplitter`. Scanner chỉ đọc
heading để tạo metadata; nội dung mỗi chunk là lát cắt nguyên văn từ nguồn.
Giữ indentation, tab, CRLF/LF, khoảng trắng cuối dòng, code và bảng.

`page_content` là **indexed representation**: prefix ngữ cảnh + lát cắt nguồn.
Dùng `source_text(chunk)` để lấy trích dẫn, không đưa toàn bộ `page_content`
ra UI như một câu quote nguyên văn. Prefix nhỏ được ghi riêng trong
`context_prefix`; không sao chép toàn bộ raw text vào metadata.

- `source_start` / `source_end`: offset ký tự Unicode Python, đầu inclusive,
  cuối exclusive; không phải byte offset hoặc JavaScript UTF-16 offset.
- Với Markdown loader, offset tính trên file UTF-8 đã decode, kể cả phần
  frontmatter được loại khỏi embedding. Loader giữ newline gốc khi đọc.
- Với Mongo loader, source là văn bản được serialize/tạo từ document.
- `source_revision`: revision của **toàn bộ tài liệu logic**. Chunker giữ giá
  trị do loader cung cấp; khi thiếu, chỉ được coi Document là toàn bộ nguồn
  và dùng SHA-256 của `page_content`. Markdown loader hash toàn file, gồm cả
  frontmatter. Cần lưu các revision trong document store để trích dẫn lịch sử.
- `markdown_section` và `section`: heading thực sự nhận diện từ Markdown.
  Section upstream nằm riêng ở `source_section`, không tự trở thành prefix.
- `chunk_index` và `total_chunks`: theo từng document.

Scanner hỗ trợ ATX heading `#` đến `######` theo cấu hình, bỏ qua heading
bên trong fenced code, indented code, HTML blocks thông dụng (comment,
script/pre/style/textarea, div/table…) và list continuation cơ bản.
Không phải CommonMark AST đầy đủ: setext heading, heading trong list/blockquote
được giữ như text; HTML custom tags và cấu trúc lồng phức tạp chưa được hỗ trợ
đầy đủ. Code block
hoặc table rất dài vẫn có thể chia qua nhiều chunk; nội dung không bị viết lại.
Khi overlap bằng 0, nối các `source_text` sẽ khôi phục nguyên văn đầu vào
không rỗng. Với overlap, dùng offsets để bỏ phần lặp khi khôi phục.

## Identity bắt buộc

Mỗi document cần `source_id` là string không rỗng **trước khi chunking**.
Không suy ra identity từ nội dung, basename hoặc object repr.

```python
from langchain_core.documents import Document
from src.agents.chunking import make_source_id, MarkdownHeaderChunker, source_text

document = Document(
    page_content="# Config\n\n    key: value\n",
    metadata={
        "source_id": make_source_id("manuals", "product-a", "guides/config.md"),
        "tenant_id": "tenant-a",
    },
)
chunks = MarkdownHeaderChunker().split_document(document)
quote = source_text(chunks[0])
```

Identity được scope bởi `source_id`, `namespace` và `tenant_id`. Hai loader
production đã cấp identity với namespace + đường dẫn tương đối hoặc
database/collection/document/case. Pipeline và CLI dùng chung
`RAG_SOURCE_NAMESPACE`; các corpus độc lập phải dùng namespace khác nhau.
Khi tạo loader Markdown trực tiếp không truyền namespace, dùng URI root folder.

ID chunk bao gồm source key, revision, section, vị trí, occurrence, version,
profile và indexed content. Vì thế thay prefix cũng đổi ID: ID đại diện cho
**representation được index**, không chỉ raw content. Thứ tự batch không ảnh
hưởng ID. `prepare_chunks_for_index` loại bản trùng hệt và từ chối metadata
mâu thuẫn; không bỏ âm thầm một nguồn không có định danh.

`chunking_profile` hash cấu hình, tokenizer, embedding model và revision thuật
toán (`3.1`). Đây là cấu hình tạo representation, tách biệt với revision nguồn.
`generate_document_hash_id()` tạo chunk ID; adapter index có storage ID riêng
để staging nhiều generation an toàn, không dùng storage ID thay source identity.

Nếu loader chia một tài liệu thành nhiều `Document`, mỗi phần phải có cùng
source identity và `source_revision` do upstream xác thực, kèm:

- `source_part_index`: số nguyên từ 0 đến `source_part_count - 1`.
- `source_part_count`: tổng số phần của snapshot hiện tại.
- `source_offset`: offset ký tự của phần đó trong toàn bộ nguồn.

Phải đưa **đủ tất cả các phần** của một revision vào một lần `sync_source_chunks`;
offset các phần không được chồng nhau. Các khoảng trống do loader loại bỏ được
phép, ví dụ frontmatter. Chunker không thể xác minh hash toàn nguồn từ một phần;
chỉ kiểm tra schema revision. Loader chịu trách nhiệm xác thực revision và khai
báo đầy đủ số phần. `chunk_index`/`total_chunks` vẫn tính riêng từng Document.

Identity không nhận datetime/Path/UUID/object tùy ý. Chuyển đổi theo schema rõ
ràng tại loader. Metadata đưa vào vector store chỉ nhận scalar hữu hạn
string/number/bool; không dùng `default=str` để che lỗi dữ liệu.
Scope identity **không thay thế authorization**: retrieval multi-tenant vẫn
phải có bộ lọc quyền từ danh tính đã xác thực.

## Budget và chất lượng ranh giới

```dotenv
RAG_CHUNK_UNIT=tokens
RAG_TOKEN_ENCODING=cl100k_base
RAG_CHUNK_SIZE=1200
RAG_CHUNK_OVERLAP=300
RAG_SOURCE_NAMESPACE=ctrlshiftn
```

Giới hạn chunk tính trên toàn bộ prefix + body. Prefix vượt 25% ngân sách
được bỏ khỏi representation; heading đầy đủ vẫn ở metadata và nội dung nguồn.
Helper cũng từ chối prefix chiếm toàn bộ ngân sách.

Ưu tiên ranh giới đoạn văn → câu → dòng → từ. Nếu không có ranh giới phù hợp,
tìm đoạn vừa budget tại offset ký tự, không chia đôi vô điều kiện. Chỉ dùng
ranh giới Unicode code point cuối cùng khi cần; không cam kết grapheme cluster.
Không chọn ranh giới tự nhiên quá sớm làm chunk chỉ dùng dưới khoảng nửa
ngân sách có thể chứa. Token được đo trên representation thật vì token count
không có tính cộng đơn giản.

Binary search vẫn là đường tìm nhanh. Khi không tìm được span tiến thêm,
fallback đo thực tế các character boundaries còn lại trước khi báo lỗi,
kể cả boundaries nằm ngoài probe đầu tiên. Không cam kết tìm span dài nhất.
Log INFO `Budget fallback` ghi số boundaries đã thử; với ngân sách quá nhỏ
hoặc tokenizer bất thường, nhánh này có thể tốn nhiều lần tokenize (worst case
bậc hai theo độ dài phần còn lại).

Overlap là suffix có độ dài không vượt mục tiêu; có thể giảm tại ranh giới
section hoặc khi cần bảo đảm tiến triển. `split_boundary` ghi loại ranh giới
cho từng chunk; log INFO đếm lần dùng fallback `unicode` mỗi document.

`RAG_EMBEDDING_MAX_TOKENS` là giới hạn độc lập, mặc định không đặt vì phụ
thuộc provider. Khi cấu hình, chế độ token dùng min(chunk budget, embedding
limit); chế độ ký tự kiểm tra token đầu ra và báo lỗi rõ nếu vượt giới hạn.
Giá trị giới hạn phải là số nguyên dương hoặc `None`; không nhận bool/float.
Chuỗi số nguyên dương trong biến môi trường được chuyển thành int.
Với model có mapping trong tiktoken, cấu hình tokenizer khác mapping bị từ chối
trước khi tải encoding. Với model/provider không có mapping, log WARNING nêu
tokenizer đang dùng; hard limit khi đó chỉ được bảo đảm theo tokenizer cấu hình,
không phải cam kết tương thích provider.

## Lifecycle index

Factory Chroma thêm hậu tố `_chunks_v3` vào collection name, không thêm lại
nếu đã có. Collection V2/legacy được giữ nguyên và không tham gia retrieval V3.
Lần nạp V3 đầu cần tạo embeddings mới; có thể phát sinh chi phí.

`sync_source_chunks` được dùng bởi cả runtime initialization và CLI:

1. Kiểm tra identity, revision, đủ các source parts, metadata, offsets và coverage
   của toàn bộ chunks trước khi ghi. Batch thiếu chunks bị từ chối.
2. Khóa collection bằng `FileLock`, đọc manifest các generation đang có hiệu lực.
3. Stage toàn bộ chunks của snapshot mới theo batch. Metadata có
   `index_generation`; input không đổi không embed lại.
4. Sau khi mọi batch thành công, công bố manifest bằng thay file cùng thư mục
   (`os.replace`). Đây là thời điểm revision mới có hiệu lực với truy vấn.
5. Xóa chunks cũ sau khi công bố. Lỗi cleanup được log và thử lại khi ingest
   source đó; chunks cũ vẫn bị loại khỏi retrieval.

Factory trả về `RevisionedChroma`. Hai phương thức similarity search đều đọc
manifest dưới cùng khóa và thêm filter generation **trước top-k**, kết hợp với
filter quyền của caller. Lỗi stage/công bố giữ nguyên các revision đang có hiệu
lực, dù records chưa công bố còn trong Chroma. Retry sẽ hoàn tất và dọn chúng.
`get()` và `count()` là công cụ quản trị, có thể tính cả records staged/stale.
Qua `ChromaVectorStore`, dùng `sync_sources(sources, chunks)`; thêm/xóa từng chunk
trực tiếp bị từ chối với managed store để tránh bypass hợp đồng snapshot.

Sửa tài liệu hoặc đổi profile/version sẽ thay thế chunk cũ khi nạp lại.
Nguồn được gửi rõ ràng với nội dung rỗng sẽ xóa chunk của nguồn đó. Nguồn
**vắng mặt** không bị xóa: có thể do giới hạn query, lỗi đọc hoặc chỉ ingest
một phần corpus. Muốn xử lý file bị xóa hoàn toàn cần đưa tombstone/source
rỗng có ID tương ứng, hoặc quy trình corpus manifest riêng.

Runtime đồng bộ khi pipeline được khởi tạo; không theo dõi thay đổi file liên
tục. Để cập nhật trong lúc server chạy, chạy CLI hoặc khởi tạo lại pipeline.

```powershell
python scripts/ingest_knowledge.py --source markdown
```

Không cần `--rebuild` cho cập nhật source V3 thông thường. Cờ đó xóa **toàn
bộ collection V3 hiệu lực**, kể cả nguồn khác không được chọn ở lần nạp lại.

Manifest nằm trong `CHROMA_PERSIST_DIR/revision_manifests/`. Tất cả readers/writers
phải đi qua adapter và cùng đường dẫn manifest/khóa. Khóa giữ suốt cả lúc tạo
embedding và query nên truy vấn có thể phải chờ ingestion. Cơ chế này dành cho
Chroma local với filesystem chung hỗ trợ file lock/atomic replace; không phải
distributed transaction hoặc giao thức cho nhiều máy. Backup/restore phải giữ
đồng bộ dữ liệu Chroma và manifest. Không đọc trực tiếp raw Chroma để retrieval.

**Nâng cấp V3 cũ:** collection chưa có manifest/chưa gắn generation sẽ chưa trả
kết quả qua adapter. Cần ingest lại toàn bộ nguồn muốn truy vấn để công bố chúng;
có thể phát sinh chi phí embedding. Bản sửa không tự thực hiện việc này.

Nếu chủ động truyền raw store vào `sync_source_chunks`, chỉ có cơ chế cũ
upsert → delete, dành cho một writer; không có bảo đảm publication/concurrent
retrieval. Runtime và CLI mặc định đều dùng adapter do factory tạo.

Chỉ chọn Mongo làm knowledge khi dữ liệu được phép; không đưa đáp án của tập
đánh giá độc lập vào RAG. Bản sửa không tự chạy CLI, gọi embedding API hay xóa
collection của bạn.

## Kiểm chứng

```powershell
python -m pytest tests/ -q
```

Test bao gồm golden Markdown/CRLF/YAML, source offsets, Unicode, input rỗng,
identity/schema, namespace, prefix, embedding cap, idempotency, stale removal
và lỗi upsert/công bố/cleanup. Có test query đồng thời với ingest, source chia
thành nhiều Document, tokenizer không đơn điệu, HTML/list/fence, và Chroma thật
dùng embedding giả lập offline. Test ngẫu nhiên với seed cố định kiểm tra
invariant budget, coverage và deterministic ID. Đánh giá recall@k/citation trên corpus thực vẫn
cần thiết; kích thước mặc định không được xem là tối ưu cho mọi bộ dữ liệu.

Lượt kiểm tra local ngày 2026-10-11: `140 passed`; corpus `src/Rag_knowledge`
gồm 31 tài liệu tạo 226 chunks với budget 1.200 tokens, overlap 300, encoding
`cl100k_base`. Chunk lớn nhất 1.199 tokens; kiểm tra offsets/reconstruction
khôi phục đúng toàn bộ nội dung đầu vào. Ranh giới gồm 208 `end`, 17 `paragraph`,
1 `sentence`; không dùng fallback Unicode hoặc fallback token không đơn điệu.
Thời gian riêng lượt chunking khoảng 0,47 giây trên máy kiểm tra, chưa tính
embedding/index/network và không phải benchmark tải đồng thời. Chưa đo recall@k.

