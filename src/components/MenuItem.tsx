function MenuItem() {
  // 仮の値
  const id: number = 1
  const name: string = "焼きそば"
  const price: number = 300

  return (
    <div>
      <h2>{name}</h2>
      <p>{price}円</p>
    </div>
  )
}

export default MenuItem
