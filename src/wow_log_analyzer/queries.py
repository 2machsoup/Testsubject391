"""GraphQL query strings for the Warcraft Logs v2 client API.

Reference: https://www.warcraftlogs.com/v2-api-docs/warcraft/
"""

REPORT_METADATA = """
query ReportMetadata($code: String!) {
  reportData {
    report(code: $code) {
      code
      title
      startTime
      endTime
      zone { id name }
      fights {
        id
        name
        difficulty
        kill
        startTime
        endTime
        encounterID
        friendlyPlayers
      }
      masterData {
        actors {
          id
          name
          type
          subType
        }
        abilities {
          gameID
          name
          type
        }
      }
    }
  }
}
"""

REPORT_RANKINGS = """
query ReportRankings($code: String!, $fightIDs: [Int], $playerMetric: ReportRankingMetricType) {
  reportData {
    report(code: $code) {
      rankings(fightIDs: $fightIDs, playerMetric: $playerMetric)
    }
  }
}
"""

REPORT_EVENTS = """
query ReportEvents(
  $code: String!
  $fightIDs: [Int]
  $startTime: Float!
  $endTime: Float!
  $dataType: EventDataType
  $sourceID: Int
  $targetID: Int
  $abilityID: Float
  $hostilityType: HostilityType
  $filterExpression: String
) {
  reportData {
    report(code: $code) {
      events(
        fightIDs: $fightIDs
        startTime: $startTime
        endTime: $endTime
        dataType: $dataType
        sourceID: $sourceID
        targetID: $targetID
        abilityID: $abilityID
        hostilityType: $hostilityType
        filterExpression: $filterExpression
        limit: 10000
      ) {
        data
        nextPageTimestamp
      }
    }
  }
}
"""

ENCOUNTER_CHARACTER_RANKINGS = """
query EncounterCharacterRankings(
  $encounterID: Int!
  $className: String
  $specName: String
  $difficulty: Int
  $metric: CharacterRankingMetricType
) {
  worldData {
    encounter(id: $encounterID) {
      characterRankings(
        className: $className
        specName: $specName
        difficulty: $difficulty
        metric: $metric
      )
    }
  }
}
"""
