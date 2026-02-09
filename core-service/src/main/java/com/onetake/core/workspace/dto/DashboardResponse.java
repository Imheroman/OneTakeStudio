package com.onetake.core.workspace.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class DashboardResponse {

    private List<RecentStudioResponse> recentStudios;
    private long connectedDestinationCount;
    private long totalStudioCount;
}
