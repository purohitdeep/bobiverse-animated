import type { Book, ChapterScope } from "@bobiverse/domain";

interface ScopeSelectorProps {
  books: Book[];
  chapterScopes: ChapterScope[];
  selectedBookId: string;
  selectedChapterScopeId: string;
  manifestLabel: string;
  onBookChange: (bookId: string) => void;
  onChapterScopeChange: (scopeId: string) => void;
}

export function ScopeSelector({
  books,
  chapterScopes,
  selectedBookId,
  selectedChapterScopeId,
  manifestLabel,
  onBookChange,
  onChapterScopeChange,
}: ScopeSelectorProps) {
  return (
    <>
      <p className="rail-label">Reading scope</p>
      <h2>Choose your progress</h2>
      <p>
        Limit the atlas to the point you have reached, then scrub the year to
        see what is visible inside that reading boundary.
      </p>
      <div className="scope-books" role="tablist" aria-label="Book selector">
        {books.map((book) => (
          <button
            key={book.id}
            type="button"
            className={
              book.id === selectedBookId
                ? "scope-book-pill active"
                : "scope-book-pill"
            }
            onClick={() => onBookChange(book.id)}
          >
            {book.shortTitle}
          </button>
        ))}
      </div>
      <label className="rail-label scope-label" htmlFor="chapter-scope-select">
        Chapter boundary
      </label>
      <select
        id="chapter-scope-select"
        className="scope-select"
        value={selectedChapterScopeId}
        onChange={(event) => onChapterScopeChange(event.target.value)}
      >
        {chapterScopes.map((scope) => (
          <option key={scope.id} value={scope.id}>
            {scope.label}
          </option>
        ))}
      </select>
      <p className="card-footnote">Active manifest: {manifestLabel}</p>
    </>
  );
}