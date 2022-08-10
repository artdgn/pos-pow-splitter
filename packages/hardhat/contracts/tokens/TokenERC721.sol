//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TokenERC721 is ERC721 {
  constructor(
    address recipient,
    uint[] memory tokenIds
  ) ERC721("NFT", "NFT") {
      for (uint i; i < tokenIds.length; i++) {
          _mint(recipient, tokenIds[i]);
      }
  }
}
