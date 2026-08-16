import MenuItem from "./MenuItem"

function MenuList() {
  // 仮の値
  const menuItems = [
    {id: 1, name: "ハンバーガー", price: 300 },
    {id: 2, name: "フライドチキン", price: 400 },
    {id: 3, name: "ピザ", price: 500 },
  ]
  return (
    <div>
      {menuItems.map((item) => (
        <MenuItem
          key={item.id}
          name={item.name}
          price={item.price}
        />
      ))}
    </div>
  )
}
export default MenuList
