import React from "react";

const ProductForm = ({
  form,
  onChange,
  onSubmit,
  submitLabel,
  isSubmitting,
  error,
}) => (
  <form className="editor-card" onSubmit={onSubmit}>
    <div className="editor-grid">
      <label className="field-group">
        <span>상품 제목</span>
        <input
          name="title"
          value={form.title}
          onChange={onChange}
          maxLength={100}
          required
          placeholder="예: 맥북 프로 14인치"
        />
      </label>

      <label className="field-group">
        <span>가격</span>
        <input
          name="price"
          value={form.price}
          onChange={onChange}
          type="number"
          min="0"
          required
          placeholder="예: 1200000"
        />
      </label>
    </div>

    <label className="field-group">
      <span>상품 설명</span>
      <textarea
        name="description"
        value={form.description}
        onChange={onChange}
        rows={8}
        maxLength={2000}
        required
        placeholder="거래 희망 장소, 사용감, 구성품을 적어주세요."
      />
    </label>

    <label className="field-group">
      <span>이미지 URL</span>
      <textarea
        name="imageUrls"
        value={form.imageUrls}
        onChange={onChange}
        rows={6}
        placeholder={"한 줄에 하나씩 입력하세요.\nhttps://.../image1.jpg\nhttps://.../image2.jpg"}
      />
      <small className="muted-text">최대 5장까지 입력할 수 있습니다.</small>
    </label>

    {error && <div className="feedback feedback--error">{error}</div>}

    <div className="editor-actions">
      <button type="submit" className="primary-button" disabled={isSubmitting}>
        {isSubmitting ? "저장 중..." : submitLabel}
      </button>
    </div>
  </form>
);

export default ProductForm;
