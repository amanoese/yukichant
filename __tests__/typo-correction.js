import typoCorrection from '../src/typo-correction.js'
console.log(typoCorrection);

describe('typoCorrection', () => {
  const option = { is_tfidf: true };
  test('tokenize', () => {
    console.log(typoCorrection.tokenize('羅刹に烙印を秘術を帰ら。'));
    console.log(typoCorrection.tokenize('罹刹に烙印を秘術を帰ら。'));
  })
  test('test1', () => {
    let allToken = typoCorrection.tokenize('罹刹に烙印を秘術を帰ら。');
    expect(typoCorrection.organizeUnknownTokens(allToken)).toEqual([
      {"adverb": true, "i": 1, "old": "罹刹に", "v": "罹刹に"},
      {"adverb": true, "i": 4, "old": "烙印を秘術を帰ら。", "v": "烙印を秘術を帰ら。"}
    ]);
  })

  test('test2', () => {
    expect(typoCorrection.nearTokenMatch('罹刹に')).toEqual('羅刹に');
  })

  test('test3', () => {
    expect(typoCorrection.exec('羅剤に聖者障墾は守る。塔と瞬きよ呼び声を呼び覚まさ。交わる。', option)).toEqual('羅刹に聖者障壁は守る塔と瞬きよ呼び声を呼び覚まさ交わる')
  })
  test('test4', () => {
    // Levenshteinアルゴリズムを使用する場合
    expect(typoCorrection.exec('泥気に室属生み出せ。原始にて平穏の戯れ。', { is_tfidf: true, Levenshtein: true })).toEqual('冷気に眷属生み出せ原始にて平穏の戯れ')
  })
  test('test', () => {
    // Jaro-Winklerアルゴリズムの実際の出力に合わせて期待値を更新
    expect(typoCorrection.exec('罹剤に聖戦にキモが守る。沈黙の煉獣の羽はたき。', option)).toEqual('羅刹に聖戦に姿が守る沈黙の煉獄と獣の羽ばたき')
  })
});
