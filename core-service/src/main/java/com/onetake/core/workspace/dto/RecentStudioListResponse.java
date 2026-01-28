package com.onetake.core.workspace.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class RecentStudioListResponse {

    private List<RecentStudioResponse> studios;
}
