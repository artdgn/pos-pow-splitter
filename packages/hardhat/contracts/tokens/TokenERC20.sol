//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenERC20 is ERC20 {
  constructor(
    address recipient,
    uint amount
  ) ERC20("Coin", "Coin") {
    _mint(recipient, amount);
  }
}
