import type { Book, ChapterScope } from "@bobiverse/domain";

interface ScopeSelectorProps {
  books: Book[];
  chapterScopes: ChapterScope[];
  selectedBookId: string;
  selectedChapterScopeId: string;
  onBookChange: (bookId: string) => void;
  onChapterScopeChange: (scopeId: string) => void;
}

export function ScopeSelector({
  books,
  chapterScopes,
  selectedBookId,
  selectedChapterScopeId,
  onBookChange,
  onChapterScopeChange,
}: ScopeSelectorProps) {
  return (
    <section className="scope-card" aria-labelledby="scope-heading">
      <div className="panel-heading">
        <p className="rail-label">Spoiler-safe scope</p>
        <h2 id="scope-heading">Where are you in the series?</h2>
        <p>
          Choose the furthest book and chapter you have read. The atlas will
          keep later reveals out of the map.
        </p>
      </div>

      <div className="book-selector" role="group" aria-label="Book selector">
        {books.map((book) => {
          const isSelected = book.id === selectedBookId;
          return (
            <button
              key={book.id}
              type="button"
              className={isSelected ? "book-option active" : "book-option"}
              aria-pressed={isSelected}
              onClick={() => onBookChange(book.id)}
            >
              <span className="book-order">{String(book.order).padStart(2, "0")}</span>
              <span className="book-option-copy">
                <strong>Book {book.order}</strong>
                <small>{book.title}</small>
              </span>
              <span className="book-option-check" aria-hidden="true">
                {isSelected ? "●" : "○"}
              </span>
            </button>
          );
        })}
      </div>

      <label className="field-label" htmlFor="chapter-scope-select">
        <span>Chapter reached</span>
        <span className="coverage-note">
          {chapterScopes.length} curated {chapterScopes.length === 1 ? "point" : "points"}
        </span>
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

      <div className="scope-assurance" role="note">
        <span className="assurance-icon" aria-hidden="true">✓</span>
        <p>
          <strong>Reading frontier protected</strong>
          <span>Later books, chapters, events, and identities stay hidden.</span>
        </p>
      </div>
    </section>
  );
}
