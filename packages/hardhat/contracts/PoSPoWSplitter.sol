pragma solidity 0.8.9;
//SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// Contract for conditionally performing actions depending on if it's on POS or POW fork
/// in order to safely split account's holding (e.g. move POW funds to different wallet
/// without replay risk on POS chain).
///
/// Using the block.difficulty check from https://eips.ethereum.org/EIPS/eip-4399
///
/// Supports sending ETH, ERC20, ERC721, and arbitrary low level calls (except payable low level calls)
///
/// Assumptions:
///     - The contract is deployed before the fork to ensure that it exists on both forks.
///     - Caller knows that the fork already occurred.
///     - block.difficulty reports difficulty on POW chain correctly (and wasn't updated in client to be over 2^64)
contract PoSPoWSplitter {
    using SafeERC20 for IERC20;

    /******* Event ********/
    event PoSForkResolved();

    /******* Modifiers ********/
    modifier onlyOnPOS() {
        require(isPOSFork, "only on POS fork");
        _;
    }

    modifier notOnPOS() {
        require(!isPOSFork, "only not on POS fork");
        _;
    }

    /******* Constants & Storage ********/

    /// flag for resolved POS state
    bool public isPOSFork;

    uint immutable public difficultyThresholdPOS;

    constructor(uint _threshold) {
        // threshold is settable to facilitate testing
        difficultyThresholdPOS = _threshold;
    }

    /******* Views ********/

    // convenience view
    function difficulty() external view returns (uint) {
        return block.difficulty;
    }

    /******* Mutative ********/

    /// can run set isPOSFork once after difficulty > TTD
    /// before that will revert, and after that will revert as well
    function resolveFork() external {
        require(!isPOSFork, "already resolved");

        // resolve according to https://eips.ethereum.org/EIPS/eip-4399
        require(block.difficulty > difficultyThresholdPOS, "block difficulty too low");

        // set the flag
        isPOSFork = true;

        emit PoSForkResolved();
    }

    /******* Generic calls ********/

    /// not payable to avoid trapping ETH
    function lowLevelCallPOW(
        address target,
        bytes calldata data,
        bool requireSuccess
    ) external notOnPOS returns (bool, bytes memory) {
        return _lowLevelCall(target, data, requireSuccess);
    }

    /// not payable to avoid trapping ETH
    function lowLevelCallPOS(
        address target,
        bytes calldata data,
        bool requireSuccess
    ) external onlyOnPOS returns (bool, bytes memory) {
        return _lowLevelCall(target, data, requireSuccess);
    }

    /******* Sending ETH ********/

    function sendETHPOW(address to) external payable notOnPOS {
        _sendETH(to);
    }

    function sendETHPOS(address to) external payable onlyOnPOS {
        _sendETH(to);
    }

    /******* ERC20 & ERC721 ********/

    /// ERC721 has same signature for "transferFrom" but different meaning to the last "uint256" (tokenId vs. amount)

    /// assumes approval was granted
    function safeTransferTokenPOW(address token, address to, uint amountOrId) external notOnPOS {
        _safeTokenTransfer(token, to, amountOrId);
    }

    /// assumes approval was granted
    function safeTransferTokenPOS(address token, address to, uint amountOrId) external onlyOnPOS {
        _safeTokenTransfer(token, to, amountOrId);
    }

    /// assumes approval was granted
    /// can be more gas efficient, but will not revert if e.g. approval was insufficient
    function unsafeTransferTokenPOW(
        address token,
        address to,
        uint amountOrId
    ) external notOnPOS returns (bool, bytes memory) {
        return _unsafeTokenTransfer(token, to, amountOrId);
    }

    /// assumes approval was granted
    /// can be more gas efficient, but will not revert if e.g. approval was insufficient
    function unsafeTransferTokenPOS(
        address token,
        address to,
        uint amountOrId
    ) external onlyOnPOS returns (bool, bytes memory){
        return _unsafeTokenTransfer(token, to, amountOrId);
    }

    /******* Internal methods ********/

    function _lowLevelCall(
        address target,
        bytes calldata data,
        bool requireSuccess
    ) internal returns (bool, bytes memory) {
        (bool success, bytes memory returnData) = address(target).call(data);
        require(!requireSuccess || success, "call unsuccessful");
        return (success, returnData);
    }

    function _sendETH(address to) internal {
        (bool success, ) = address(to).call{value : msg.value}("");
        require(success, "sending ETH unsuccessful");
    }

    function _safeTokenTransfer(address token, address to, uint amountOrId) internal {
        IERC20(token).safeTransferFrom(msg.sender, to, amountOrId);
    }

    function _unsafeTokenTransfer(address token, address to, uint amountOrId) internal returns (bool, bytes memory) {
        // don't care about return value here, if it failed it failed
        // caller should check balanceOf to be sure anyway
        return address(token).call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, to, amountOrId)
        );
    }
}
