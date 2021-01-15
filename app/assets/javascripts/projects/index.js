// Place all the behaviors and hooks related to the matching controller here.
// All this logic will automatically be available in application.js.

// TODO
// - error handling of assigning user to project, check XHR data.errors
// - error handling of removing user from project, check XHR data.errors
// - refresh project users tab after manage user modal is closed
// - refactor view handling using library, ex. backbone.js

/* global animateSpinner initFormSubmitLinks HelperModule dropdownSelector Sidebar Turbolinks */

(function() {
  const PERMISSIONS = ['editable', 'archivable', 'restorable'];
  var projectsWrapper = '#projectsWrapper';
  var toolbarWrapper = '#toolbarWrapper';
  var cardsWrapper = '#cardsWrapper';
  var editProjectModal = '#edit-modal';
  var moveToModal = '#move-to-modal';

  var manageProjectUsersModal = null;
  var exportProjectsModal = null;
  var exportProjectsModalHeader = null;
  var exportProjectsModalBody = null;
  var exportProjectsBtn = '.export-projects-btn';
  var exportProjectsSubmit = '#export-projects-modal-submit';

  let projectsCurrentSort;
  let projectsViewSearch;
  let createdOnFromFilter;
  let createdOnToFilter;
  let membersFilter;
  let lookInsideFolders;
  let archivedOnFromFilter;
  let archivedOnToFilter;

  // Arrays with selected project and folder IDs shared between both views
  var selectedProjects = [];
  var selectedProjectFolders = [];
  var destinationFolder;

  // Init new project folder modal function
  function initNewProjectFolderModal() {
    var newProjectFolderModal = '#new-project-folder-modal';

    // Modal's submit handler function
    $(projectsWrapper)
      .on('ajax:success', newProjectFolderModal, function(ev, data) {
        $(newProjectFolderModal).modal('hide');
        HelperModule.flashAlertMsg(data.message, 'success');
        refreshCurrentView();
      })
      .on('ajax:error', newProjectFolderModal, function(e, data) {
        let form = $(this).find('form#new_project_folder');
        form.renderFormErrors('project_folder', data.responseJSON);
      });

    $(projectsWrapper)
      .on('ajax:success', '.new-project-folder-btn', function(e, data) {
        // Add and show modal
        $(toolbarWrapper).append($.parseHTML(data.html));
        $(newProjectFolderModal).modal('show');
        $(newProjectFolderModal).find("input[type='text']").focus();
        // Remove modal when it gets closed
        $(newProjectFolderModal).on('hidden.bs.modal', function() {
          $(newProjectFolderModal).remove();
        });
      });
  }

  /**
   * Initialize the JS for new project modal to work.
   */
  function initNewProjectModal() {
    var newProjectModal = '#new-project-modal';

    // Modal's submit handler function
    $(projectsWrapper)
      .on('ajax:success', newProjectModal, function(ev, data) {
        $(newProjectModal).modal('hide');
        HelperModule.flashAlertMsg(data.message, 'success');
        refreshCurrentView();
      })
      .on('ajax:error', newProjectModal, function(ev, data) {
        $(this).renderFormErrors('project', data.responseJSON);
      });

    $(projectsWrapper)
      .on('ajax:success', '.new-project-btn', function(ev, data) {
        // Add and show modal
        $(toolbarWrapper).append($.parseHTML(data.html));
        $(newProjectModal).modal('show');
        $(newProjectModal).find("input[type='text']").focus();
        // Remove modal when it gets closed
        $(newProjectModal).on('hidden.bs.modal', function() {
          $(newProjectModal).remove();
        });
      });
  }

  // init project toolbar archive/restore functions
  function initArchiveRestoreToolbarButtons() {
    $(projectsWrapper)
      .on('ajax:before', '.archive-projects-form, .restore-projects-form', function() {
        let buttonForm = $(this);
        buttonForm.find('input[name="projects_ids[]"]').remove();
        selectedProjects.forEach(function(id) {
          $('<input>').attr({
            type: 'hidden',
            name: 'projects_ids[]',
            value: id
          }).appendTo(buttonForm);
        });
      })
      .on('ajax:success', '.archive-projects-form, .restore-projects-form', function(ev, data) {
        HelperModule.flashAlertMsg(data.message, 'success');
        // Project saved, reload view
        refreshCurrentView();
      })
      .on('ajax:error', '.archive-projects-form, .restore-projects-form', function(ev, data) {
        HelperModule.flashAlertMsg(data.responseJSON.message, 'danger');
      });
  }

  // init project card archive/restore function
  function initArchiveRestoreButton() {
    $(projectsWrapper)
      .on('ajax:success', 'form.edit_project', function(ev, data) {
        HelperModule.flashAlertMsg(data.message, 'success');
        // Project saved, reload view
        refreshCurrentView();
      })
      .on('ajax:error', 'form.edit_project', function(ev, data) {
        HelperModule.flashAlertMsg(data.responseJSON.message, 'danger');
      })
      .on('ajax:complete', 'form.edit_project', function() {
        animateSpinner($('#projects-cards-view').closest('.tab-content'), false);
      });
  }

  function initManageUsersModal() {
    // Reload users tab HTML element when modal is closed
    manageProjectUsersModal.on('hide.bs.modal', function() {
      refreshCurrentView();
    });
  }

  /**
   * Initialize the JS for export projects modal to work.
   */
  function initExportProjectsModal() {
    $(projectsWrapper).on('click', exportProjectsBtn, function(ev) {
      ev.stopPropagation();
      ev.preventDefault();
      // Load HTML to refresh users list
      $.ajax({
        url: $(exportProjectsBtn).data('export-projects-modal-url'),
        type: 'GET',
        dataType: 'json',
        data: {
          project_ids: selectedProjects,
          project_folder_ids: selectedProjectFolders
        },
        success: function(data) {
          // Update modal title
          exportProjectsModalHeader.html(data.title);

          // Set modal body
          exportProjectsModalBody.html(data.html);

          // Update modal footer (show/hide buttons)
          if (data.status === 'error') {
            $('#export-projects-modal-close').show();
            $('#export-projects-modal-cancel').hide();
            $(exportProjectsSubmit).hide();
          } else {
            $('#export-projects-modal-close').hide();
            $('#export-projects-modal-cancel').show();
            $(exportProjectsSubmit).show();
          }
          // Show the modal
          exportProjectsModal.modal('show');
        },
        error: function() {
          // TODO
        }
      });
    });

    // Remove modal content when modal window is closed.
    exportProjectsModal.on('hidden.bs.modal', function() {
      exportProjectsModalHeader.html('');
      exportProjectsModalBody.html('');
    });
  }

  function initExportProjects() {
    // Submit the export projects
    $(exportProjectsSubmit).click(function() {
      $.ajax({
        url: $(exportProjectsSubmit).data('export-projects-submit-url'),
        type: 'POST',
        dataType: 'json',
        data: {
          project_ids: selectedProjects,
          project_folder_ids: selectedProjectFolders
        },
        success: function(data) {
          // Hide modal and show success flash
          exportProjectsModal.modal('hide');
          HelperModule.flashAlertMsg(data.flash, 'success');
        },
        error: function() {
          // TODO
        }
      });
    });
  }

  // Initialize ajax listeners and elements style on modal body. This
  // function must be called when modal body is changed.
  function initManageProjectUsersModalBody(data) {
    manageProjectUsersModal.find('.modal-title').html(data.html_title);
    manageProjectUsersModal.find('.modal-body').html(data.html_body).find('.selectpicker').selectpicker();
    manageProjectUsersModal.find('.modal-footer').html(data.html_footer);
  }

  // Initialize manage project users modal remote loading.
  function initManageProjectUsersLink() {
    $(projectsWrapper).on('ajax:success', '.manage-project-users-link', function(e, data) {
      initManageProjectUsersModalBody(data);
      manageProjectUsersModal.modal('show');
    });
  }

  // Initialize reloading manage user modal content after posting new
  // user.
  function initAddUserForm() {
    manageProjectUsersModal
      .on('ajax:success', '.add-user-form', function(e, data) {
        var errorBlock;
        initManageProjectUsersModalBody(data);
        if (data.status === 'error') {
          $(this).addClass('has-error');
          errorBlock = $(this).find('span.help-block');
          if (errorBlock.length && errorBlock.length > 0) {
            errorBlock.html(data.error);
          } else {
            $(this).append("<span class='help-block col-xs-8'>" + data.error + '</span>');
          }
        }
      });
  }

  // Initialize remove user from project links.
  function initRemoveUserLinks() {
    manageProjectUsersModal.on('ajax:success', '.remove-user-link', function(e, data) {
      initManageProjectUsersModalBody(data);
    });
  }

  //
  function initUserRoleForms() {
    manageProjectUsersModal
      .on('change', '.update-user-form select', function() {
        $(this).parents('form').submit();
      });

    manageProjectUsersModal
      .on('ajax:success', '.update-user-form', function(e, data) {
        initManageProjectUsersModalBody(data);
      })
      .on('ajax:error', function() {
        // TODO
      });
  }

  function updateSelectedCards() {
    $('.project-card').removeClass('selected');
    $.each(selectedProjects, function(index, value) {
      let selectedCard = $('.project-card[data-id="' + value + '"]');
      selectedCard.addClass('selected');
    });
  }

  function checkActionPermission(permission) {
    return selectedProjects.every(function(projectId) {
      return $(`.project-card[data-id="${projectId}"]`).data(permission);
    });
  }

  function updateProjectsToolbar() {
    let projectsToolbar = $('#projectsToolbar');

    if (selectedProjects.length === 0 && selectedProjectFolders.length === 0) {
      projectsToolbar.find('.single-object-action, .multiple-object-action').addClass('hidden');
    } else {
      if (selectedProjects.length + selectedProjectFolders.length === 1) {
        projectsToolbar.find('.single-object-action, .multiple-object-action').removeClass('hidden');
        if (selectedProjectFolders.length === 1) {
          projectsToolbar.find('.project-only-action').addClass('hidden');
        }
      } else {
        projectsToolbar.find('.single-object-action').addClass('hidden');
        projectsToolbar.find('.multiple-object-action').removeClass('hidden');
        if (selectedProjectFolders.length > 0) {
          projectsToolbar.find('.project-only-action').addClass('hidden');
        }
      }
      PERMISSIONS.forEach((permission) => {
        if (!checkActionPermission(permission)) {
          projectsToolbar.find(`.btn[data-for="${permission}"]`).addClass('hidden');
        }
      });
    }
  }

  $(projectsWrapper).on('click', '.project-folder-link', function(event) {
    event.preventDefault();
    event.stopPropagation();
    let viewContainer = $(cardsWrapper);
    viewContainer.data('projects-cards-url', $(this).data('projectsCardsUrl'));
    history.replaceState({}, '', this.href);
    $('.sidebar-container').data('sidebar-url', $(this).data('sidebar-url'));
    refreshCurrentView();
  });

  function refreshCurrentView() {
    loadCardsView();
    Sidebar.reload({
      sort: projectsCurrentSort,
      view_mode: $('.projects-index').data('view-mode')
    });
  }

  function initEditButton() {
    function loadEditModal(url) {
      $.get(url, function(result) {
        $(editProjectModal).find('.modal-content').html(result.html);
        $(editProjectModal).modal('show');
        $(editProjectModal).find('form')
          .on('ajax:success', function(ev, data) {
            $(editProjectModal).modal('hide');
            HelperModule.flashAlertMsg(data.message, 'success');
            refreshCurrentView();
          }).on('ajax:error', function(ev, data) {
            HelperModule.flashAlertMsg(data.responseJSON.message, 'danger');
            $(this).renderFormErrors('project', data.responseJSON.errors);
            $(this).renderFormErrors('project_folder', data.responseJSON.errors);
          });
      });
    }

    $(toolbarWrapper).on('click', '.edit-btn', function(ev) {
      var editUrl = $(`.project-card[data-id=${selectedProjects[0]}]`).data('edit-url') ||
        $(`.folder-card[data-id=${selectedProjectFolders[0]}]`).data('edit-url');
      ev.stopPropagation();
      ev.preventDefault();
      loadEditModal(editUrl);
    });

    $('.projects-container').on('click', '.edit-project-btn', function(ev) {
      var editUrl = $(this).attr('href');
      ev.stopPropagation();
      ev.preventDefault();
      loadEditModal(editUrl);
    });
  }

  function initMoveButton() {
    function initializeJSTree(foldersTree) {
      var timeOut = false;

      foldersTree.jstree({
        core: {
          multiple: false,
          themes: {
            dots: false,
            variant: 'large'
          }
        },
        search: {
          show_only_matches: true,
          show_only_matches_children: true
        },
        plugins: ['wholerow', 'search']
      });

      foldersTree.on('changed.jstree', function(e, data) {
        destinationFolder = data.instance.get_node(data.selected[0]).id.replace('folder_', '');
      });

      // Search timeout
      $('#searchFolderTree').keyup(function() {
        if (timeOut) { clearTimeout(timeOut); }
        timeOut = setTimeout(function() {
          foldersTree.jstree(true).search($('#searchFolderTree').val());
        }, 250);
      });
    }

    function loadMoveToModal(url) {
      let items;
      let projects;
      let folders;

      if ((selectedProjects.length) && (selectedProjectFolders.length)) {
        items = 'project_and_folders';
      } else if (selectedProjectFolders.length) {
        items = 'folders';
      } else {
        items = 'projects';
      }
      projects = selectedProjects.map(e => ({ id: e, type: 'project' }));
      folders = selectedProjectFolders.map(e => ({ id: e, type: 'project_folder' }));
      let movables = projects.concat(folders);

      $.get(url, { items: items, sort: projectsCurrentSort, view_mode: $('.projects-index').data('view-mode') }, function(result) {
        $(moveToModal).find('.modal-content').html(result.html);
        $(moveToModal).modal('show');
        initializeJSTree($(moveToModal).find('#moveToFolders'));

        $(moveToModal).find('form')
          .on('ajax:before', function() {
            $('<input>').attr({
              type: 'hidden',
              name: 'destination_folder_id',
              value: destinationFolder
            }).appendTo($(this));

            $('<input>').attr({
              type: 'hidden',
              name: 'movables',
              value: JSON.stringify(movables)
            }).appendTo($(this));
          })
          .on('ajax:success', function(ev, data) {
            $(moveToModal).modal('hide');
            HelperModule.flashAlertMsg(data.flash, 'success');
            refreshCurrentView();
          })
          .on('ajax:error', function(ev, data) {
            $(moveToModal).modal('hide');
            HelperModule.flashAlertMsg(data.responseJSON.flash, 'danger');
          });
      });
    }

    $(projectsWrapper).on('click', '.move-projects-btn', function(e) {
      e.preventDefault();
      loadMoveToModal($(this).data('url'));
    });
  }

  function loadCardsView() {
    var viewContainer = $(cardsWrapper);
    $.ajax({
      url: viewContainer.data('projects-cards-url'),
      type: 'GET',
      dataType: 'json',
      data: {
        view_mode: $('.projects-index').data('view-mode'),
        sort: projectsCurrentSort,
        search: projectsViewSearch,
        members: membersFilter,
        created_on_from: createdOnFromFilter,
        created_on_to: createdOnToFilter,
        folders_search: lookInsideFolders,
        archived_on_from: archivedOnFromFilter,
        archived_on_to: archivedOnToFilter
      },
      success: function(data) {
        $('#breadcrumbsWrapper').html(data.breadcrumbs_html);
        $(toolbarWrapper).html(data.toolbar_html);
        viewContainer.data('projects-cards-url', data.projects_cards_url);
        viewContainer.removeClass('no-results');
        viewContainer.find('.card, .projects-group, .no-results-container').remove();
        viewContainer.append(data.cards_html);
        if (viewContainer.find('.no-results-container').length) {
          viewContainer.addClass('no-results');
        }
        selectedProjects.length = 0;
        selectedProjectFolders.length = 0;
        updateProjectsToolbar();
      },
      error: function() {
        viewContainer.html('Error loading project list');
      }
    });
  }

  function initProjectsViewModeSwitch() {
    let projectsPageSelector = '.projects-index';

    // list/cards switch
    $(projectsPageSelector).on('click', '.projects-view-mode', function() {
      let $btn = $(this);
      $('.projects-view-mode').removeClass('active');
      if ($btn.hasClass('view-switch-cards')) {
        $(cardsWrapper).removeClass('list');
      } else if ($btn.hasClass('view-switch-list')) {
        $(cardsWrapper).addClass('list');
      }
      $btn.addClass('active');
    });

    // Active/Archived switch
    // We have different sorting, filters for active/archived views.
    // With turbolinks visit all those elements are updated.
    $(projectsPageSelector).on('click', '.archive-switch', function() {
      $(projectsPageSelector).find('.projects-container').remove();
      Turbolinks.visit($(this).data('url'));
    });
  }

  function initSorting() {
    $('#sortMenuDropdown a').click(function() {
      if (projectsCurrentSort !== $(this).data('sort')) {
        $('#sortMenuDropdown a').removeClass('selected');
        projectsCurrentSort = $(this).data('sort');
        refreshCurrentView();
        $(this).addClass('selected');
        $('#sortMenu').dropdown('toggle');
      }
    });
  }

  function appliedFiltersMark() {
    let filtersEnabled = projectsViewSearch
      || createdOnFromFilter
      || createdOnToFilter
      || (membersFilter && membersFilter.length !== 0)
      || lookInsideFolders
      || archivedOnFromFilter
      || archivedOnToFilter;
    if (filtersEnabled) {
      $('.filter-container').addClass('filters-applied');
    } else {
      $('.filter-container').removeClass('filters-applied');
    }
  }

  function initProjectsFilters() {
    let $projectsFilter = $('.projects-index .projects-filters');
    let $membersFilter = $('.members-filter', $projectsFilter);
    let $foldersCB = $('#folder_search', $projectsFilter);
    let $createdOnFromFilter = $('#createdOnFromDate', $projectsFilter);
    let $createdOnToFilter = $('#createdOnToDate', $projectsFilter);
    let $archivedOnFromFilter = $('#archivedOnFromDate', $projectsFilter);
    let $archivedOnToFilter = $('#archivedOnToDate', $projectsFilter);
    let $textFilter = $('#textSearchFilterInput', $projectsFilter);

    dropdownSelector.init($membersFilter, {
      optionClass: 'checkbox-icon users-dropdown-list',
      optionLabel: (data) => {
        return `<img class="item-avatar" src="${data.params.avatar_url}"/> ${data.label}`;
      },
      tagLabel: (data) => {
        return `<img class="item-avatar" src="${data.params.avatar_url}"/> ${data.label}`;
      },
      labelHTML: true,
      tagClass: 'users-dropdown-list'
    });

    $textFilter.click((e) => {
      e.stopPropagation();
      $('#textSearchFilterHistory').toggle();
      $textFilter.closest('.dropdown').toggleClass('open');
    }).on('input', () => {
      $('#textSearchFilterHistory').hide();
      $textFilter.closest('.dropdown').removeClass('open');
    });

    $projectsFilter.on('click', '.projects-search-keyword', function(e) {
      e.stopPropagation();
      e.preventDefault();
      $textFilter.val($(this).data('keyword'));
      $('#textSearchFilterHistory').hide();
      $textFilter.closest('.dropdown').removeClass('open');
    });

    $projectsFilter.on('click', '#folderSearchInfoBtn', function(e) {
      e.stopPropagation();
      $('#folderSearchInfo').toggle();
    });

    $('.project-filters-dropdown').on('show.bs.dropdown', function() {
      let teamId = $projectsFilter.data('team-id');
      $('#textSearchFilterHistory').find('li').remove();

      try {
        let storagePath = `project_filters_per_team/${teamId}/recent_search_keywords`;
        let recentSearchKeywords = JSON.parse(localStorage.getItem(storagePath));
        $.each(recentSearchKeywords, function(i, keyword) {
          $('#textSearchFilterHistory').append($(
            `<li class="dropdown-item">
              <a class="projects-search-keyword" href="#" data-keyword="${keyword}">
                <i class="fas fa-history"></i>
                <span class="keyword-text">${keyword}</span>
              </a>
            </li>`
          ));
        });
      } catch (error) {
        console.error(error);
      }
    }).on('hide.bs.dropdown', function() {
      $('#textSearchFilterHistory').hide();
      $textFilter.closest('.dropdown').removeClass('open');
      $('#folderSearchInfo').hide();
    });

    $('#applyProjectFiltersButton').click((e) => {
      e.stopPropagation();
      e.preventDefault();

      let teamId = $('.projects-filters').data('team-id');
      projectsViewSearch = $('#textSearchFilterInput').closest('.select-block').find('input[type=text]').val();
      try {
        let storagePath = `project_filters_per_team/${teamId}/recent_search_keywords`;
        let recentSearchKeywords = JSON.parse(localStorage.getItem(storagePath));
        if (!Array.isArray(recentSearchKeywords)) recentSearchKeywords = [];
        if (recentSearchKeywords.indexOf(projectsViewSearch) !== -1) {
          recentSearchKeywords.splice(recentSearchKeywords.indexOf(projectsViewSearch), 1);
        }
        if (recentSearchKeywords.length > 4) {
          recentSearchKeywords = recentSearchKeywords.slice(0, 4);
        }
        recentSearchKeywords.unshift(projectsViewSearch);
        localStorage.setItem(storagePath, JSON.stringify(recentSearchKeywords));
      } catch (error) {
        console.error(error);
      }

      $(e.target).closest('.dropdown').removeClass('open');

      createdOnFromFilter = $createdOnFromFilter.val();
      createdOnToFilter = $createdOnToFilter.val();
      membersFilter = dropdownSelector.getValues($('.members-filter'));
      lookInsideFolders = $foldersCB.prop('checked');
      archivedOnFromFilter = $archivedOnFromFilter.val();
      archivedOnToFilter = $archivedOnToFilter.val();

      appliedFiltersMark();
      refreshCurrentView();
    });

    // Clear filters
    $('.clear-button', $projectsFilter).click((e) => {
      e.stopPropagation();
      e.preventDefault();

      dropdownSelector.clearData($membersFilter);
      if ($createdOnFromFilter.data('DateTimePicker')) $createdOnFromFilter.data('DateTimePicker').clear();
      if ($createdOnToFilter.data('DateTimePicker')) $createdOnToFilter.data('DateTimePicker').clear();
      if ($archivedOnFromFilter.data('DateTimePicker')) $archivedOnFromFilter.data('DateTimePicker').clear();
      if ($archivedOnToFilter.data('DateTimePicker')) $archivedOnToFilter.data('DateTimePicker').clear();
      $foldersCB.prop('checked', false);
      $textFilter.val('');
    });

    // Prevent filter window close
    $($projectsFilter).click((e) => {
      if (!$(e.target).is('input,a')) {
        e.stopPropagation();
        e.preventDefault();
        $('#textSearchFilterHistory').hide();
        $textFilter.closest('.dropdown').removeClass('open');
        dropdownSelector.closeDropdown($membersFilter);
        $('#folderSearchInfo').hide();
      }
    });
  }

  /**
   * Initializes cards view
   */
  function init() {
    manageProjectUsersModal = $('#manageProjectUsersModal');
    exportProjectsModal = $('#export-projects-modal');
    exportProjectsModalHeader = exportProjectsModal.find('.modal-title');
    exportProjectsModalBody = exportProjectsModal.find('.modal-body');

    updateSelectedCards();
    initNewProjectFolderModal();
    initNewProjectModal();
    initManageUsersModal();
    initExportProjectsModal();
    initExportProjects();
    initArchiveRestoreToolbarButtons();
    initManageProjectUsersLink();
    initAddUserForm();
    initRemoveUserLinks();
    initUserRoleForms();
    initEditButton();
    initMoveButton();
    initProjectsViewModeSwitch();
    initSorting();
    initProjectsFilters();
    initFormSubmitLinks($('.project-card'));
    initArchiveRestoreButton();
    loadCardsView();

    $(projectsWrapper).on('click', '.folder-card-selector', function() {
      let folderCard = $(this).closest('.folder-card');
      let folderId = folderCard.data('id');
      let index = $.inArray(folderId, selectedProjectFolders);

      // If checkbox is checked and row ID is not in list of selected folder IDs
      if (this.checked && index === -1) {
        selectedProjectFolders.push(folderId);
      // Otherwise, if checkbox is not checked and ID is in list of selected IDs
      } else if (!this.checked && index !== -1) {
        selectedProjectFolders.splice(index, 1);
      }

      updateProjectsToolbar();
    });

    $(projectsWrapper).on('click', '.project-card-selector', function() {
      let projectCard = $(this).closest('.project-card');
      let projectId = projectCard.data('id');
      // Determine whether ID is in the list of selected project IDs
      let index = $.inArray(projectId, selectedProjects);

      // If checkbox is checked and row ID is not in list of selected project IDs
      if (this.checked && index === -1) {
        $(this).closest('.project-card').addClass('selected');
        selectedProjects.push(projectId);
      // Otherwise, if checkbox is not checked and ID is in list of selected IDs
      } else if (!this.checked && index !== -1) {
        $(this).closest('.project-card').removeClass('selected');
        selectedProjects.splice(index, 1);
      }

      updateProjectsToolbar();
    });
  }

  init();
}());
