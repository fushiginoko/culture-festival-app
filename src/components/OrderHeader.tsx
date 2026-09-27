import OrderSteps from "./OrderSteps";
import tootLogo from "../assets/TOOT_logo.svg";
import "./OrderHeader.css";

type OrderHeaderProps = {
  currentStep: 1 | 2 | 3;
};

function OrderHeader({ currentStep }: OrderHeaderProps) {
  return (
    <header className="order-header">
      <div className="order-header__brand">
        <img src={tootLogo} alt="" className="order-header__logo" />
        <div>
          <strong>TOOT</strong>
          <span>FESTIVAL KITCHEN</span>
        </div>
      </div>
      <OrderSteps currentStep={currentStep} />
    </header>
  );
}

export default OrderHeader;
