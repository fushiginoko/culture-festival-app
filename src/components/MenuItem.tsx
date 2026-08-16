function MenuItem(props: any) {

  return (
    <div>
      <h2>{props.name}</h2>
      <p>{props.price}円</p>
    </div>
  )
}

export default MenuItem
