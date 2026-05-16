// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title AISwarmOracle
/// @notice Threshold-signature gate for proposal admission. Independent AI agents sign
///         an EIP-712 verdict over (proposalId, score, reasoningHash, deadline). The governor
///         submits the bundle; if at least `threshold` registered agents have signed and the
///         aggregate score clears `minScore`, the proposal is admitted to the market phase.
contract AISwarmOracle is EIP712 {
    error NotAdmin();
    error AlreadyRegistered();
    error NotRegistered();
    error TooFewSignatures();
    error ScoreBelowMin();
    error VerdictExpired();
    error AlreadyVerdicted();
    error DuplicateSigner();
    error BadSigner();

    event AgentRegistered(address indexed agent);
    event AgentRevoked(address indexed agent);
    event VerdictAccepted(uint256 indexed proposalId, uint256 score, bytes32 reasoningHash, uint256 signers);

    bytes32 private constant VERDICT_TYPEHASH =
        keccak256("Verdict(uint256 proposalId,uint256 score,bytes32 reasoningHash,uint256 deadline)");

    address public admin;
    uint256 public threshold;
    uint256 public minScore;
    uint256 public agentCount;

    mapping(address => bool) public isAgent;
    mapping(uint256 => bool) public verdictRecorded;
    mapping(uint256 => uint256) public verdictScore;
    mapping(uint256 => bytes32) public verdictReasoning;

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address admin_, uint256 threshold_, uint256 minScore_) EIP712("MODAOAISwarmOracle", "1") {
        admin = admin_;
        threshold = threshold_;
        minScore = minScore_;
    }

    function registerAgent(address agent) external onlyAdmin {
        if (isAgent[agent]) revert AlreadyRegistered();
        isAgent[agent] = true;
        agentCount++;
        emit AgentRegistered(agent);
    }

    function revokeAgent(address agent) external onlyAdmin {
        if (!isAgent[agent]) revert NotRegistered();
        isAgent[agent] = false;
        agentCount--;
        emit AgentRevoked(agent);
    }

    /// @notice Verify and record a threshold verdict. Reverts if insufficient sigs, expired,
    ///         duplicate signer, non-registered signer, or score below admission floor.
    /// @param signatures Array of 65-byte ECDSA signatures from registered agents over the typed verdict.
    function submitVerdict(
        uint256 proposalId,
        uint256 score,
        bytes32 reasoningHash,
        uint256 deadline,
        bytes[] calldata signatures
    ) external returns (bool admitted) {
        if (verdictRecorded[proposalId]) revert AlreadyVerdicted();
        if (block.timestamp > deadline) revert VerdictExpired();
        if (signatures.length < threshold) revert TooFewSignatures();
        if (score < minScore) revert ScoreBelowMin();

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(VERDICT_TYPEHASH, proposalId, score, reasoningHash, deadline))
        );

        // Enforce strictly-ascending signer addresses → cheap dedup + fixed iteration order.
        address last = address(0);
        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = ECDSA.recover(digest, signatures[i]);
            if (!isAgent[signer]) revert BadSigner();
            if (signer <= last) revert DuplicateSigner();
            last = signer;
        }

        verdictRecorded[proposalId] = true;
        verdictScore[proposalId] = score;
        verdictReasoning[proposalId] = reasoningHash;
        emit VerdictAccepted(proposalId, score, reasoningHash, signatures.length);
        return true;
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function verdictDigest(uint256 proposalId, uint256 score, bytes32 reasoningHash, uint256 deadline)
        external
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(keccak256(abi.encode(VERDICT_TYPEHASH, proposalId, score, reasoningHash, deadline)));
    }
}
