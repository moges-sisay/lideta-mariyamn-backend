function normalizeCommitteeValue(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u1200-\u137f]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildBigrams(value) {
  if (value.length < 2) {
    return [value];
  }

  const bigrams = [];

  for (let index = 0; index < value.length - 1; index += 1) {
    bigrams.push(value.slice(index, index + 2));
  }

  return bigrams;
}

function calculateSimilarity(left = "", right = "") {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);
  const rightPool = [...rightBigrams];
  let overlap = 0;

  leftBigrams.forEach((token) => {
    const matchIndex = rightPool.indexOf(token);

    if (matchIndex >= 0) {
      overlap += 1;
      rightPool.splice(matchIndex, 1);
    }
  });

  return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
}

function getMemberCommittee(member) {
  return member.committee || "Unassigned";
}

function createCommitteeGroups(members, options = {}) {
  const threshold = typeof options.threshold === "number" ? options.threshold : 0.75;
  const clusters = [];

  members.forEach((member) => {
    const rawCommittee = getMemberCommittee(member);
    const normalizedCommittee = normalizeCommitteeValue(rawCommittee) || "unassigned";

    let targetCluster = clusters.find(
      (cluster) => calculateSimilarity(cluster.normalizedCommittee, normalizedCommittee) >= threshold
    );

    if (!targetCluster) {
      targetCluster = {
        committee: rawCommittee || "Unassigned",
        normalizedCommittee,
        members: [],
      };
      clusters.push(targetCluster);
    }

    if (
      targetCluster.committee === "Unassigned" ||
      rawCommittee.length > targetCluster.committee.length
    ) {
      targetCluster.committee = rawCommittee || targetCluster.committee;
    }

    targetCluster.members.push(member);
  });

  return clusters
    .map((cluster) => ({
      committee: cluster.committee,
      normalizedCommittee: cluster.normalizedCommittee,
      count: cluster.members.length,
      members: cluster.members,
    }))
    .sort((left, right) => left.committee.localeCompare(right.committee));
}

module.exports = {
  calculateSimilarity,
  createCommitteeGroups,
  getMemberCommittee,
  normalizeCommitteeValue,
};
